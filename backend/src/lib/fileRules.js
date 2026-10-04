import path from 'node:path';

const MAX_NAME_LENGTH = 255;

// PRD 5.3 item 17: executable and script types are not allowed.
export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'dll', 'sh', 'ps1', 'vbs', 'apk', 'jar',
]);

/** Returns a safe display name, or '' if nothing usable is left. */
export function sanitizeName(raw) {
  let name = String(raw ?? '')
    .normalize('NFC')
    .replace(/[\\/]+/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  if (name === '' || name === '.' || name === '..') return '';
  if (name.length > MAX_NAME_LENGTH) {
    const ext = path.extname(name);
    name = name.slice(0, MAX_NAME_LENGTH - ext.length) + ext;
  }
  return name;
}

/** Blocks by extension and by executable signatures (Windows PE "MZ", Linux ELF). */
export function isBlockedFile(name, buffer) {
  const ext = path.extname(name).slice(1).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) return true;
  if (buffer && buffer.length >= 4) {
    const isPE = buffer[0] === 0x4d && buffer[1] === 0x5a;
    const isELF = buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46;
    if (isPE || isELF) return true;
  }
  return false;
}

/** "report.pdf" -> "report (1).pdf" when the name is already taken. */
export function nextAvailableName(name, taken) {
  if (!taken.has(name)) return name;
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let i = 1; i < 10000; i += 1) {
    const suffix = ` (${i})`;
    const room = MAX_NAME_LENGTH - ext.length - suffix.length;
    const candidate = `${stem.slice(0, room)}${suffix}${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Could not generate a unique file name.');
}

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
