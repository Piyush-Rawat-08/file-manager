import { createContext, useContext, useEffect, useState } from 'react';
import { authClient } from './authClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined while loading

  useEffect(() => {
    authClient.getSession().then(({ data }) => setSession(data.session));
    const { data } = authClient.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, user: session?.user ?? null }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
