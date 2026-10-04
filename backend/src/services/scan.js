// Hook for a real malware scanner (for example ClamAV). Not implemented yet:
// it currently lets every file through. Executable files are still blocked by
// lib/fileRules.js. Return { ok: false } to reject an upload.
export async function scanBuffer(/* buffer */) {
  return { ok: true };
}
