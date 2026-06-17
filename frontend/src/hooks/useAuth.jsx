import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api.js';
import { useSSE } from './useSSE.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('xu_token'));
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshWallet = useCallback(async (t = token) => {
    if (!t) return;
    try {
      const w = await api.wallet.balance(t);
      setWallet(w);
    } catch {}
  }, [token]);

  useSSE(token, {
    balance_update: ({ balance }) => {
      setWallet(prev => prev ? { ...prev, balance } : { balance });
    },
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('xu_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      refreshWallet(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('xu_token', data.token);
    localStorage.setItem('xu_user', JSON.stringify(data.user));
    await refreshWallet(data.token);
    return data;
  };

  const register = async (username, email, password, referral_code, otp_code) => {
    const data = await api.auth.register({ username, email, password, referral_code, otp_code });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('xu_token', data.token);
    localStorage.setItem('xu_user', JSON.stringify(data.user));
    await refreshWallet(data.token);
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setWallet(null);
    localStorage.removeItem('xu_token');
    localStorage.removeItem('xu_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, wallet, loading, login, register, logout, refreshWallet }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
