import crypto from 'node:crypto';
import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { config } from '../config.js';
import { requireAuth, requireVerified } from '../middleware/auth.js';
import { File } from '../models/File.js';
import { Report } from '../models/Report.js';
import { consume, today } from '../services/counters.js';
import { scanBuffer } from '../services/scan.js';
import { putObject, deleteObject, signedDownloadUrl } from '../services/storage.js';
import { totalStoredBytes, usageFor } from '../services/usage.js';
import { escapeRegex, isBlockedFile, nextAvailableName, sanitizeName } from '../lib/fileRules.js';

const router = Router();
const { limits } = config;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: limits.maxFileBytes, files: 1 } });
const MB = 1024 * 1024;

const toDto = (f) => ({
  id: String(f._id),
  name: f.name,
  size: f.size,
  mimeType: f.mimeType,
  createdAt: f.createdAt,
  shareToken: f.shareToken || null,
  disabled: f.disabled,
});

async function takenNames(ownerId, excludeId) {
  const filter = { ownerId };
  if (excludeId) filter._id = { $ne: excludeId };
  const rows = await File.find(filter).select('name').lean();
  return new Set(rows.map((r) => r.name));
}

// Loads one of the caller's own files, or answers 404 (never reveals other users' files).
async function ownFile(req, res) {
  const { id } = req.params;
  const file = mongoose.isValidObjectId(id) ? await File.findOne({ _id: id, ownerId: req.user.id }) : null;
  if (!file) res.status(404).json({ error: 'File not found. It may have been deleted.' });
  return file;
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  const filter = { ownerId: req.user.id };
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };

  const [files, usage] = await Promise.all([
    File.find(filter).sort({ createdAt: -1 }).lean(),
    usageFor(req.user.id),
  ]);
  res.json({
    files: files.map(toDto),
    quota: { usedBytes: usage.bytes, fileCount: usage.count, limitBytes: limits.userQuotaBytes, maxFiles: limits.maxFilesPerUser },
  });
});

router.post('/', requireVerified, upload.single('file'), async (req, res) => {
  const uid = req.user.id;
  const { file } = req;
  if (!file) return res.status(400).json({ error: 'Choose a file to upload.' });

  // multer reads names as latin1; restore the original UTF-8.
  const name = sanitizeName(Buffer.from(file.originalname, 'latin1').toString('utf8'));
  if (!name) return res.status(400).json({ error: 'That file name is not valid.' });
  if (file.size === 0) return res.status(400).json({ error: 'Empty files cannot be uploaded.' });
  if (isBlockedFile(name, file.buffer)) return res.status(400).json({ error: 'This file type is not allowed.' });

  const usage = await usageFor(uid);
  if (usage.count >= limits.maxFilesPerUser) {
    return res.status(409).json({ error: `You can store up to ${limits.maxFilesPerUser} files. Delete some to upload more.` });
  }
  if (usage.bytes + file.size > limits.userQuotaBytes) {
    return res.status(413).json({ error: `Not enough storage left. Your limit is ${Math.round(limits.userQuotaBytes / MB)} MB.` });
  }
  if ((await totalStoredBytes()) + file.size > limits.globalStorageBytes * limits.pauseAtFraction) {
    return res.status(503).json({ error: 'Uploads are paused because storage is almost full. Try again later.' });
  }
  if (!(await scanBuffer(file.buffer)).ok) {
    return res.status(400).json({ error: 'This file was rejected by the security scan.' });
  }
  if (!(await consume(`up:${uid}:${today()}`, 1, limits.uploadsPerDay))) {
    return res.status(429).json({ error: `Daily upload limit reached (${limits.uploadsPerDay} files). Try again tomorrow.` });
  }

  const finalName = nextAvailableName(name, await takenNames(uid));
  const storageKey = `${uid}/${crypto.randomUUID()}`; // user input never appears in the key
  await putObject(storageKey, file.buffer, file.mimetype);
  try {
    const doc = await File.create({
      ownerId: uid, name: finalName, storageKey, size: file.size, mimeType: file.mimetype,
    });
    return res.status(201).json({ file: toDto(doc) });
  } catch (err) {
    await deleteObject(storageKey).catch(() => {}); // no orphan object if the DB write fails
    throw err;
  }
});

router.get('/:id/download', async (req, res) => {
  const file = await ownFile(req, res);
  if (!file) return undefined;
  if (file.disabled) return res.status(403).json({ error: 'This file was disabled after a report.' });
  return res.json({ url: await signedDownloadUrl(file.storageKey, file.name) });
});

router.patch('/:id', async (req, res) => {
  const file = await ownFile(req, res);
  if (!file) return undefined;
  const name = sanitizeName(req.body?.name);
  if (!name) return res.status(400).json({ error: 'Enter a valid file name.' });
  if (name !== file.name) {
    file.name = nextAvailableName(name, await takenNames(req.user.id, file._id));
    await file.save();
  }
  return res.json({ file: toDto(file) });
});

router.delete('/:id', async (req, res) => {
  const file = await ownFile(req, res);
  if (!file) return undefined;
  await deleteObject(file.storageKey); // permanent; if this throws, the DB row stays and the user can retry
  await file.deleteOne();
  await Report.deleteMany({ fileId: file._id });
  return res.json({ ok: true });
});

router.post('/:id/share', requireVerified, async (req, res) => {
  const file = await ownFile(req, res);
  if (!file) return undefined;
  if (file.disabled) return res.status(403).json({ error: 'This file was disabled after a report.' });
  if (!file.shareToken) {
    file.shareToken = crypto.randomBytes(24).toString('base64url'); // unguessable, no expiry (PRD)
    await file.save();
  }
  return res.json({ shareToken: file.shareToken });
});

router.delete('/:id/share', async (req, res) => {
  const file = await ownFile(req, res);
  if (!file) return undefined;
  file.shareToken = undefined;
  await file.save();
  return res.json({ ok: true });
});

export default router;
