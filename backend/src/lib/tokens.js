import crypto from 'node:crypto';
import { config } from '../config.js';

function base64UrlEncode(data) {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

/** Signs a JSON payload into a secure HMAC SHA256 token */
export function signToken(payload, expiresInSeconds = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const toSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(toSign)
    .digest('base64url');

  return `${toSign}.${signature}`;
}

/** Verifies and decodes a signed token. Returns payload or null if invalid/expired. */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const toSign = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(toSign)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/** Signs local file download query parameters to prevent unauthorized downloads */
export function signDownload(key, filename, expiresInSeconds = 60) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const message = `${key}:${filename}:${exp}`;
  const sig = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(message)
    .digest('base64url');

  return { exp, sig };
}

/** Verifies the download signature */
export function verifyDownload(key, filename, exp, sig) {
  const now = Math.floor(Date.now() / 1000);
  if (Number(exp) < now) return false;

  const message = `${key}:${filename}:${exp}`;
  const expectedSig = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(message)
    .digest('base64url');

  const sigBuf = Buffer.from(String(sig || ''));
  const expBuf = Buffer.from(expectedSig);
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}
