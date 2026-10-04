import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { signDownload } from '../lib/tokens.js';

export async function putObject(key, body) {
  const filePath = path.join(config.localStorageDir, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
}

export async function deleteObject(key) {
  const filePath = path.join(config.localStorageDir, key);
  await fs.unlink(filePath).catch(() => {});
}

/** 60-second download link with cryptographic signature */
export async function signedDownloadUrl(key, filename) {
  const { exp, sig } = signDownload(key, filename, 60);
  return `${config.apiUrl}/api/download?key=${encodeURIComponent(key)}&name=${encodeURIComponent(filename)}&exp=${exp}&sig=${sig}`;
}
