import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User } from '../types';
import api from '../lib/api';

interface AuthContextType {
  user:      User | null;
  token:     string | null;
  isLoading: boolean;
  login:     (email: string, password: string) => Promise<void>;
  logout:    () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const saveUser = (u: User) => localStorage.setItem('sl_user', JSON.stringify(u));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,      setUser]      = useState<User | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Au chargement : restaurer la session puis la revalider auprès du serveur
  useEffect(() => {
    const savedToken = localStorage.getItem('sl_token');
    const savedUser  = localStorage.getItem('sl_user');
    if (!savedToken || !savedUser) { setIsLoading(false); return; }
    try {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } catch {
      localStorage.removeItem('sl_token');
      localStorage.removeItem('sl_user');
      setIsLoading(false);
      return;
    }
    api.get<{ data: User }>('/auth/me')
      .then(res => { setUser(res.data.data); saveUser(res.data.data); })
      .catch(() => { /* 401 : l'intercepteur renvoie vers la connexion */ })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('sl_token', t);
    saveUser(u);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* session déjà fermée */ }
    localStorage.removeItem('sl_token');
    localStorage.removeItem('sl_user');
    setUser(null);
    setToken(null);
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveUser(next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
