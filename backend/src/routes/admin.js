import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAdmin } from '../middleware/auth.js';
import { File } from '../models/File.js';
import { Report } from '../models/Report.js';

// Minimal moderation (PRD 5.3 item 20). Call with the x-admin-key header.
const router = Router();
router.use(requireAdmin);

router.get('/reports', async (_req, res) => {
  const reports = await Report.find().sort({ createdAt: -1 }).limit(100)
    .populate('fileId', 'name size ownerId disabled').lean();
  res.json({ reports });
});

async function setDisabled(req, res, disabled) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'File not found.' });
  const file = await File.findByIdAndUpdate(req.params.id, { disabled }, { new: true });
  if (!file) return res.status(404).json({ error: 'File not found.' });
  return res.json({ id: String(file._id), disabled: file.disabled });
}

router.post('/files/:id/disable', (req, res) => setDisabled(req, res, true));
router.post('/files/:id/enable', (req, res) => setDisabled(req, res, false));

export default router;
