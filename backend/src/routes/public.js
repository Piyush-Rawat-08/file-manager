import { Router } from 'express';
import { config } from '../config.js';
import { File } from '../models/File.js';
import { Report } from '../models/Report.js';
import { consume, today } from '../services/counters.js';
import { signedDownloadUrl } from '../services/storage.js';

const router = Router();
const { limits } = config;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,64}$/;
const GONE = { error: 'This link is no longer available.' };

// Same answer for deleted, revoked and disabled files, so nothing leaks about which one it was.
async function sharedFile(token) {
  if (!TOKEN_PATTERN.test(token)) return null;
  return File.findOne({ shareToken: token, disabled: false });
}

router.get('/:token', async (req, res) => {
  const file = await sharedFile(req.params.token);
  if (!file) return res.status(404).json(GONE);
  return res.json({ name: file.name, size: file.size });
});

// POST (not GET) so link previews and crawlers cannot use up the daily caps.
router.post('/:token/download', async (req, res) => {
  const file = await sharedFile(req.params.token);
  if (!file) return res.status(404).json(GONE);

  const day = today();
  const allowed =
    (await consume(`dlc:${file.shareToken}:${day}`, 1, limits.shareDownloadsPerLinkPerDay)) &&
    (await consume(`dlb:${file.ownerId}:${day}`, file.size, limits.shareBytesPerAccountPerDay));
  if (!allowed) return res.status(429).json({ error: 'This link is temporarily unavailable. Try again tomorrow.' });

  return res.json({ url: await signedDownloadUrl(file.storageKey, file.name) });
});

router.post('/:token/report', async (req, res) => {
  const file = await sharedFile(req.params.token);
  if (!file) return res.status(404).json(GONE);
  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  await Report.create({ fileId: file._id, reason });
  return res.status(201).json({ ok: true });
});

export default router;
