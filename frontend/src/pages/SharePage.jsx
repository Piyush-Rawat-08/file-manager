import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatBytes } from '../lib/format';

function getFileExtension(filename) {
  const parts = filename.split('.');
  if (parts.length > 1) {
    const ext = parts.pop().toLowerCase();
    if (ext.length <= 4) return ext;
  }
  return 'file';
}

export default function SharePage() {
  const { token } = useParams();
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [reported, setReported] = useState(false);

  useEffect(() => {
    api.sharedFile(token).then(setFile).catch((e) => setError(e.message));
  }, [token]);

  async function download() {
    setError('');
    try {
      const { url } = await api.sharedDownload(token);
      window.location.assign(url);
    } catch (e) {
      setError(e.message);
    }
  }

  async function report(event) {
    event.preventDefault();
    try {
      await api.reportShared(token, reason);
      setReported(true);
      setReporting(false);
    } catch (e) {
      setError(e.message);
    }
  }

  if (!file) {
    return (
      <div className="auth-wrapper">
        <main className="auth-card">
          {error ? (
            <div className="msg error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          ) : (
            <p className="status">Loading shared file…</p>
          )}
        </main>
      </div>
    );
  }

  const ext = getFileExtension(file.name);

  return (
    <div className="auth-wrapper">
      <main className="auth-card">
        <div className="auth-header">
          <div className="brand-icon" style={{ background: '#f1f5f9', color: '#0f172a', boxShadow: 'none', border: '1px solid var(--line)' }} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <h1 className="share-name" style={{ fontSize: '1.25rem', wordBreak: 'break-word', textAlign: 'center' }}>{file.name}</h1>
          <p className="muted">{formatBytes(file.size)} · {ext.toUpperCase()} file</p>
        </div>

        {error && (
          <div className="msg error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button className="primary" onClick={download} style={{ width: '100%', justifyContent: 'center', padding: '11px 18px', fontSize: '0.95rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          Download File
        </button>

        {reported ? (
          <div className="msg ok" role="status">
            <span>Thanks. We have received your report and will review this file.</span>
          </div>
        ) : reporting ? (
          <form onSubmit={report} style={{ width: '100%', marginTop: '8px' }}>
            <label>
              Report a problem with this file
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why this file should be removed…"
                maxLength={500}
                rows={3}
                required
              />
            </label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" onClick={() => setReporting(false)}>Cancel</button>
              <button type="submit" className="danger">Submit report</button>
            </div>
          </form>
        ) : (
          <button className="link" onClick={() => setReporting(true)} style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
            Report this file
          </button>
        )}
      </main>
    </div>
  );
}
