import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { verifyDownload } from './lib/tokens.js';
import filesRouter from './routes/files.js';
import publicRouter from './routes/public.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';

const app = express();
app.set('trust proxy', config.trustProxy);

app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '10kb' }));

const limiter = (limit) =>
  rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Slow down and try again soon.' } });

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', limiter(60), authRouter);

// Local file download endpoint for signed URLs in local storage mode
app.get('/api/download', (req, res) => {
  const key = String(req.query.key || '');
  const filename = String(req.query.name || 'download');
  const exp = req.query.exp;
  const sig = req.query.sig;

  if (!key || !verifyDownload(key, filename, exp, sig)) {
    return res.status(403).json({ error: 'Download link is invalid or has expired.' });
  }

  const safeStorageRoot = path.resolve(config.localStorageDir);
  const targetPath = path.resolve(safeStorageRoot, key);
  if (!targetPath.startsWith(safeStorageRoot)) {
    return res.status(400).json({ error: 'Invalid file path.' });
  }

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'File not found.' });
  }

  const encodedFilename = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
  return fs.createReadStream(targetPath).pipe(res);
});

app.use('/api/public', limiter(60), publicRouter); // per-IP, PRD 5.3 item 24
app.use('/api/admin', limiter(60), adminRouter);
app.use('/api/files', limiter(600), filesRouter);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooBig ? 413 : 400).json({
      error: tooBig ? `File is larger than ${Math.round(config.limits.maxFileBytes / 1024 / 1024)} MB.` : 'Upload failed. Check the file and try again.',
    });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong. Try again.' });
});

export default app;
