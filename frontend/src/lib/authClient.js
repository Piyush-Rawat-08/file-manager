// Local Authentication Client
const listeners = new Set();

const notifyListeners = (event, session) => {
  for (const listener of listeners) {
    try {
      listener(event, session);
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  }
};

const getStoredSession = () => {
  try {
    const raw = localStorage.getItem('local_auth_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const authClient = {
  async getSession() {
    const session = getStoredSession();
    return { data: { session } };
  },

  onAuthStateChange(callback) {
    listeners.add(callback);
    Promise.resolve().then(() => {
      callback('INITIAL_SESSION', getStoredSession());
    });
    return {
      data: {
        subscription: {
          unsubscribe: () => listeners.delete(callback),
        },
      },
    };
  },

  async signUp({ email, password }) {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { data: { session: null, user: null }, error: new Error(data.error || 'Sign up failed') };
      }
      if (data.session) {
        localStorage.setItem('local_auth_session', JSON.stringify(data.session));
        notifyListeners('SIGNED_IN', data.session);
      }
      return { data, error: null };
    } catch (err) {
      return { data: { session: null, user: null }, error: err };
    }
  },

  async signIn({ email, password }) {
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { data: { session: null, user: null }, error: new Error(data.error || 'Sign in failed') };
      }
      if (data.session) {
        localStorage.setItem('local_auth_session', JSON.stringify(data.session));
        notifyListeners('SIGNED_IN', data.session);
      }
      return { data, error: null };
    } catch (err) {
      return { data: { session: null, user: null }, error: err };
    }
  },

  // Alias for compatibility
  async signInWithPassword({ email, password }) {
    return this.signIn({ email, password });
  },

  async signOut() {
    try {
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});
    } finally {
      localStorage.removeItem('local_auth_session');
      notifyListeners('SIGNED_OUT', null);
    }
    return { error: null };
  },
};

// Also expose authClient.auth so any authClient.auth.* call works identically
authClient.auth = authClient;
