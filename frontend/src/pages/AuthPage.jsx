import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../lib/authClient';
import { useAuth } from '../lib/auth';

export default function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (mode === 'signup' && password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    const { data, error: authError } =
      mode === 'signup'
        ? await authClient.signUp({ email, password })
        : await authClient.signIn({ email, password });
    setBusy(false);

    if (authError) {
      setError(authError.message);
    } else if (mode === 'signup' && !data?.session) {
      setNotice('Account created! You can now sign in.');
      setMode('signin');
    }
  }

  const signingUp = mode === 'signup';

  return (
    <div className="auth-wrapper">
      <main className="auth-card">
        <div className="auth-header">
          <div className="brand-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
            </svg>
          </div>
          <h1>{signingUp ? 'Create your account' : 'Welcome back'}</h1>
          <p>{signingUp ? 'Start managing and sharing your files securely' : 'Sign in to access your file manager'}</p>
        </div>

        <form onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              required
            />
          </label>

          {error && (
            <div className="msg error" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="msg ok" role="status">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span>{notice}</span>
            </div>
          )}

          <button className="primary" disabled={busy} style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: '0.95rem' }}>
            {busy ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          className="link"
          style={{ alignSelf: 'center' }}
          onClick={() => {
            setMode(signingUp ? 'signin' : 'signup');
            setError('');
            setNotice('');
          }}
        >
          {signingUp ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
        </button>
      </main>
    </div>
  );
}
