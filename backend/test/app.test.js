import test from 'node:test';
import assert from 'node:assert/strict';

Object.assign(process.env, {
  ADMIN_API_KEY: 'secret-admin-key',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/filemanager',
});
const { default: app } = await import('../src/app.js');

let server; let base;
test.before(async () => {
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('health check', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
});

test('files API requires a token', async () => {
  const res = await fetch(`${base}/api/files`);
  assert.equal(res.status, 401);
});

test('admin API rejects a missing or wrong key', async () => {
  assert.equal((await fetch(`${base}/api/admin/reports`)).status, 403);
  assert.equal((await fetch(`${base}/api/admin/reports`, { headers: { 'x-admin-key': 'nope-nope-nope-no' } })).status, 403);
});

test('malformed share tokens look like a missing link and never touch the database', async () => {
  const res = await fetch(`${base}/api/public/short`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'This link is no longer available.');
});

test('unknown API routes return JSON 404', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
});
