import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeName, isBlockedFile, nextAvailableName, escapeRegex } from '../src/lib/fileRules.js';

test('sanitizeName strips paths and control characters', () => {
  assert.equal(sanitizeName('../../etc/passwd'), '.._.._etc_passwd');
  assert.equal(sanitizeName('  a\u0000b.txt '), 'ab.txt');
  assert.equal(sanitizeName('..'), '');
  assert.equal(sanitizeName(undefined), '');
});

test('sanitizeName keeps the extension when truncating', () => {
  const out = sanitizeName(`${'a'.repeat(300)}.pdf`);
  assert.equal(out.length, 255);
  assert.ok(out.endsWith('.pdf'));
});

test('isBlockedFile catches extensions and executable signatures', () => {
  assert.equal(isBlockedFile('setup.EXE', Buffer.from('hi')), true);
  assert.equal(isBlockedFile('photo.jpg', Buffer.from('MZ\x90\x00')), true);
  assert.equal(isBlockedFile('tool', Buffer.from([0x7f, 0x45, 0x4c, 0x46])), true);
  assert.equal(isBlockedFile('notes.txt', Buffer.from('hello')), false);
});

test('nextAvailableName numbers duplicates', () => {
  assert.equal(nextAvailableName('a.pdf', new Set()), 'a.pdf');
  assert.equal(nextAvailableName('a.pdf', new Set(['a.pdf'])), 'a (1).pdf');
  assert.equal(nextAvailableName('a.pdf', new Set(['a.pdf', 'a (1).pdf'])), 'a (2).pdf');
  const long = `${'x'.repeat(251)}.pdf`;
  assert.ok(nextAvailableName(long, new Set([long])).length <= 255);
});

test('escapeRegex neutralises regex characters', () => {
  assert.equal(new RegExp(escapeRegex('a.b(c)*')).test('a.b(c)*'), true);
  assert.equal(new RegExp(escapeRegex('a.b')).test('axb'), false);
});
