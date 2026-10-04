import test from 'node:test';
import assert from 'node:assert/strict';
import { signToken, verifyToken, signDownload, verifyDownload } from '../src/lib/tokens.js';

test('signToken and verifyToken create and validate HMAC tokens', () => {
  const payload = { sub: 'user-123', email: 'user@example.com', email_confirmed_at: new Date().toISOString() };
  const token = signToken(payload, 3600);
  assert.ok(token);

  const decoded = verifyToken(token);
  assert.ok(decoded);
  assert.equal(decoded.sub, 'user-123');
  assert.equal(decoded.email, 'user@example.com');
  assert.ok(decoded.email_confirmed_at);
});

test('verifyToken rejects tampered or expired tokens', () => {
  const token = signToken({ sub: 'user-123' }, -10); // already expired
  assert.equal(verifyToken(token), null);

  const validToken = signToken({ sub: 'user-123' }, 3600);
  const tampered = validToken.slice(0, -4) + 'abcd';
  assert.equal(verifyToken(tampered), null);
  assert.equal(verifyToken('garbage.token'), null);
});

test('signDownload and verifyDownload validate download tokens', () => {
  const key = 'user-123/file-uuid';
  const name = 'document.pdf';
  const { exp, sig } = signDownload(key, name, 60);

  assert.equal(verifyDownload(key, name, exp, sig), true);
  assert.equal(verifyDownload(key, 'other.pdf', exp, sig), false);
  assert.equal(verifyDownload('other-user/file-uuid', name, exp, sig), false);
  assert.equal(verifyDownload(key, name, exp - 100, sig), false); // expired
});
