import crypto from 'node:crypto';
import { config } from '../config.js';
import { verifyToken } from '../lib/tokens.js';

/** Validates the access token sent by the browser. */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });

  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: 'Your session expired. Sign in again.' });
  }

  req.user = {
    id: payload.sub,
    email: payload.email,
    verified: Boolean(payload.email_confirmed_at),
  };
  return next();
}

/** PRD 5.1 item 3: uploading and sharing need a verified email. */
export function requireVerified(req, res, next) {
  if (!req.user.verified) {
    return res.status(403).json({ error: 'Verify your email address before uploading or sharing files.' });
  }
  return next();
}

export function requireAdmin(req, res, next) {
  const expected = Buffer.from(config.adminApiKey);
  const given = Buffer.from(String(req.headers['x-admin-key'] || ''));
  const ok = expected.length > 0 && given.length === expected.length && crypto.timingSafeEqual(given, expected);
  if (!ok) return res.status(403).json({ error: 'Not allowed.' });
  return next();
}
