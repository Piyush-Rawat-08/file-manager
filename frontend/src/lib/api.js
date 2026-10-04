import { authClient } from './authClient';

const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, { method = 'GET', body, form, auth = true } = {}) {
  const headers = {};
  if (auth) {
    const { data } = await authClient.getSession();
    if (data?.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  let payload;
  if (form) {
    payload = form;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed. Try again.');
  return data;
}

export const api = {
  listFiles: (q) => request(`/files${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  uploadFile: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/files', { method: 'POST', form });
  },
  downloadUrl: (id) => request(`/files/${id}/download`),
  renameFile: (id, name) => request(`/files/${id}`, { method: 'PATCH', body: { name } }),
  deleteFile: (id) => request(`/files/${id}`, { method: 'DELETE' }),
  createShare: (id) => request(`/files/${id}/share`, { method: 'POST' }),
  revokeShare: (id) => request(`/files/${id}/share`, { method: 'DELETE' }),
  sharedFile: (token) => request(`/public/${token}`, { auth: false }),
  sharedDownload: (token) => request(`/public/${token}/download`, { method: 'POST', auth: false }),
  reportShared: (token, reason) => request(`/public/${token}/report`, { method: 'POST', auth: false, body: { reason } }),
};
