import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthToken } from '../lib/api.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ai-skills-portal.token';

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  // Keep the API client's token in sync with state.
  useEffect(() => { setAuthToken(token); }, [token]);

  // On mount, if we have a token, fetch the user.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!token) { setLoading(false); return; }
      try {
        const data = await api.get('/users/me');
        if (!cancelled) setUser(data.user);
      } catch (err) {
        if (!cancelled) {
          setToken(null);
          localStorage.removeItem(TOKEN_KEY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(async (payload) => {
    setError(null);
    try {
      const data = await api.post('/auth/register', payload);
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      setError(err.message);
      return { ok: false, error: err.message, fields: err.fields };
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setError(null);
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { ok: false, error: err.message, fields: err.fields };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('profile_gate_dismissed');
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch) => {
    if (patch && Object.keys(patch).length > 0) {
      const data = await api.patch('/users/me', patch);
      setUser(data.user);
      return data.user;
    }
    // Re-fetch without patching (used after actions like complete-profile)
    const data = await api.get('/users/me');
    setUser(data.user);
    return data.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, error, register, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
