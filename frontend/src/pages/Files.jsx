import { useCallback, useEffect, useRef, useState } from 'react';
import { authClient } from '../lib/authClient';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatBytes, formatDate } from '../lib/format';

const shareLink = (token) => `${window.location.origin}/s/${token}`;

function getFileExtension(filename) {
  const parts = filename.split('.');
  if (parts.length > 1) {
    const ext = parts.pop().toLowerCase();
    if (ext.length <= 4) return ext;
  }
  return 'file';
}

function getBadgeClass(ext) {
  if (['pdf'].includes(ext)) return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return 'img';
  if (['txt', 'md', 'doc', 'docx'].includes(ext)) return 'txt';
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp'].includes(ext)) return 'code';
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) return 'zip';
  return '';
}

export default function Files() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [quota, setQuota] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Modals state
  const [renameModal, setRenameModal] = useState({ isOpen: false, file: null, name: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, file: null });
  const [shareModal, setShareModal] = useState({ isOpen: false, file: null, token: '', copied: false });

  const inputRef = useRef(null);
  const renameInputRef = useRef(null);
  const latest = useRef(0);

  // Auto-remove notification after 2.5 seconds (or 4s for errors)
  const notify = (kind, text, duration = kind === 'ok' ? 2500 : 4000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotices((list) => [...list.slice(-3), { id, kind, text }]);
    if (duration > 0) {
      setTimeout(() => {
        setNotices((list) => list.filter((n) => n.id !== id));
      }, duration);
    }
  };

  const dismissNotice = (id) => {
    setNotices((list) => list.filter((n) => n.id !== id));
  };

  const load = useCallback(async (q) => {
    const id = ++latest.current;
    try {
      const data = await api.listFiles(q);
      if (id !== latest.current) return;
      setFiles(data.files);
      setQuota(data.quota);
    } catch (e) {
      notify('error', e.message);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(query), 250);
    return () => clearTimeout(timer);
  }, [query, load]);

  useEffect(() => {
    if (renameModal.isOpen && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renameModal.isOpen]);

  async function uploadFiles(list) {
    const picked = Array.from(list);
    if (!picked.length) return;
    setUploading(true);
    for (const file of picked) {
      try {
        await api.uploadFile(file);
        notify('ok', `Uploaded ${file.name}`); // Disappears after 2.5 seconds
      } catch (e) {
        notify('error', `${file.name}: ${e.message}`);
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    load(query);
  }

  async function run(action, onDone) {
    try {
      const result = await action();
      if (onDone) onDone(result);
      load(query);
    } catch (e) {
      notify('error', e.message);
    }
  }

  const download = (f) => run(() => api.downloadUrl(f.id), ({ url }) => window.location.assign(url));

  const openRename = (f) => {
    setRenameModal({ isOpen: true, file: f, name: f.name });
  };

  const submitRename = async (e) => {
    e.preventDefault();
    const { file, name } = renameModal;
    if (!file || !name.trim() || name === file.name) {
      setRenameModal({ isOpen: false, file: null, name: '' });
      return;
    }
    await run(() => api.renameFile(file.id, name.trim()), () => {
      notify('ok', `Renamed to ${name.trim()}`);
    });
    setRenameModal({ isOpen: false, file: null, name: '' });
  };

  const openDelete = (f) => {
    setDeleteModal({ isOpen: true, file: f });
  };

  const confirmDelete = async () => {
    const { file } = deleteModal;
    if (!file) return;
    setDeleteModal({ isOpen: false, file: null });
    await run(() => api.deleteFile(file.id), () => {
      notify('ok', `Deleted ${file.name}`);
    });
  };

  const openShare = async (f) => {
    if (f.shareToken) {
      setShareModal({ isOpen: true, file: f, token: f.shareToken, copied: false });
    } else {
      await run(() => api.createShare(f.id), ({ shareToken }) => {
        setShareModal({ isOpen: true, file: f, token: shareToken, copied: false });
        notify('ok', 'Public share link generated');
      });
    }
  };

  const copyShareLink = async () => {
    if (!shareModal.token) return;
    const url = shareLink(shareModal.token);
    try {
      await navigator.clipboard.writeText(url);
      setShareModal((prev) => ({ ...prev, copied: true }));
      notify('ok', 'Link copied to clipboard');
      setTimeout(() => setShareModal((prev) => ({ ...prev, copied: false })), 2000);
    } catch {
      notify('error', 'Failed to copy link automatically');
    }
  };

  const revokeShare = async () => {
    const { file } = shareModal;
    if (!file) return;
    setShareModal({ isOpen: false, file: null, token: '', copied: false });
    await run(() => api.revokeShare(file.id), () => {
      notify('ok', `Stopped sharing ${file.name}`);
    });
  };

  const usedPct = quota ? Math.min(100, (quota.usedBytes / quota.limitBytes) * 100) : 0;
  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="page">
      {/* Floating Non-intrusive Toasts */}
      <div className="toast-container" aria-live="polite">
        {notices.map((n) => (
          <div key={n.id} className={`toast ${n.kind}`}>
            {n.kind === 'error' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--danger)', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ok)', flexShrink: 0 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            )}
            <span>{n.text}</span>
            <button className="toast-close" onClick={() => dismissNotice(n.id)} aria-label="Dismiss notification">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="top">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
            </svg>
          </div>
          <span className="brand-title">File Manager</span>
        </div>

        <div className="who">
          <div className="user-badge">
            <span className="avatar" aria-hidden="true">{userInitial}</span>
            <span>{user?.email}</span>
          </div>
          <button className="link" onClick={() => authClient.signOut()}>Sign out</button>
        </div>
      </header>

      {/* Storage Quota Card */}
      {quota && (
        <section className="quota-card" aria-label="Storage quota">
          <div className="quota-header">
            <span className="quota-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
              Storage Capacity
            </span>
            <span className="quota-metrics">
              {formatBytes(quota.usedBytes)} of {formatBytes(quota.limitBytes)} ({Math.round(usedPct)}%)
            </span>
          </div>

          <div className={`meter ${usedPct > 80 ? 'warning' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usedPct)}>
            <span style={{ width: `${usedPct}%` }} />
          </div>

          <div className="quota-footer">
            <span>{quota.fileCount} of {quota.maxFiles} files stored</span>
            <span>10 MB max per upload</span>
          </div>
        </section>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        className={`dropzone${dragging ? ' over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} id="picker" type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
        <div className="drop-icon-wrapper" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
        </div>
        <div>
          <div className="drop-prompt">
            {uploading ? <span><strong>Uploading files…</strong> Please wait</span> : <span><strong>Click to upload</strong> or drag and drop files here</span>}
          </div>
          <div className="drop-hint">PDF, Images, Documents, Code, Archives (up to 10 MB)</div>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="toolbar">
        <div className="search-container">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            type="search"
            placeholder="Search files by name…"
            aria-label="Search files by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Upload
        </button>
      </div>

      {/* File List Card */}
      <div className="files-card">
        {loading ? (
          <div className="empty-state">
            <p className="status" style={{ margin: 0 }}>Loading files…</p>
          </div>
        ) : files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div className="empty-title">{query ? 'No matching files found' : 'No files uploaded yet'}</div>
            <p className="empty-desc">{query ? `No files matched "${query}". Try searching for another keyword.` : 'Upload documents, pictures, or data files using the dropzone above.'}</p>
          </div>
        ) : (
          <ul className="file-list">
            {files.map((f) => {
              const ext = getFileExtension(f.name);
              const badgeClass = getBadgeClass(ext);
              return (
                <li key={f.id} className="file-row">
                  <div className="file-leading">
                    <span className={`file-badge ${badgeClass}`}>{ext}</span>
                    <div className="file-info">
                      <span className="file-name">{f.name}</span>
                      <div className="file-meta">
                        <span>{formatBytes(f.size)}</span>
                        <span>·</span>
                        <span>{formatDate(f.createdAt)}</span>
                        {f.shareToken && (
                          <>
                            <span>·</span>
                            <span className="shared-badge">
                              <span className="shared-dot" />
                              Shared
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="actions">
                    <button title="Download file" onClick={() => download(f)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" x2="12" y1="15" y2="3"/>
                      </svg>
                      Download
                    </button>

                    <button title={f.shareToken ? 'View or copy share link' : 'Create public share link'} onClick={() => openShare(f)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                      {f.shareToken ? 'Share link' : 'Share'}
                    </button>

                    <button title="Rename file" onClick={() => openRename(f)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                      Rename
                    </button>

                    <button className="danger" title="Delete file" onClick={() => openDelete(f)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Rename Modal */}
      {renameModal.isOpen && (
        <div className="modal-overlay" onClick={() => setRenameModal({ isOpen: false, file: null, name: '' })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div>
                <div className="modal-title">Rename file</div>
                <p className="modal-desc">Enter a new name for this file.</p>
              </div>
            </div>

            <form onSubmit={submitRename}>
              <input
                ref={renameInputRef}
                type="text"
                value={renameModal.name}
                onChange={(e) => setRenameModal((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setRenameModal({ isOpen: false, file: null, name: '' })}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ isOpen: false, file: null })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon red">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <div>
                <div className="modal-title">Delete file permanently?</div>
                <p className="modal-desc">
                  Are you sure you want to delete <strong>{deleteModal.file?.name}</strong>? This action cannot be undone and any active public share links will stop working immediately.
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setDeleteModal({ isOpen: false, file: null })}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={confirmDelete}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {shareModal.isOpen && (
        <div className="modal-overlay" onClick={() => setShareModal({ isOpen: false, file: null, token: '', copied: false })}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
              <div>
                <div className="modal-title">Public share link</div>
                <p className="modal-desc">Anyone with this link can view and download <strong>{shareModal.file?.name}</strong>.</p>
              </div>
            </div>

            <div className="share-url-box">
              <input
                className="share-url-input"
                readOnly
                value={shareLink(shareModal.token)}
                onClick={(e) => e.target.select()}
              />
              <button type="button" className="primary" onClick={copyShareLink}>
                {shareModal.copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="danger link" onClick={revokeShare} style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>
                Revoke Link
              </button>
              <button type="button" className="secondary" onClick={() => setShareModal({ isOpen: false, file: null, token: '', copied: false })}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
