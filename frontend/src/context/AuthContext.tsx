import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import * as authService from '../services/authService.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('outbox_token');
    const savedUser = localStorage.getItem('outbox_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse saved user', e);
        localStorage.removeItem('outbox_token');
        localStorage.removeItem('outbox_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    const data = await authService.login(email, pass);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('outbox_token', data.token);
    localStorage.setItem('outbox_user', JSON.stringify(data.user));
  };

  const register = async (email: string, pass: string, name: string) => {
    const data = await authService.register(email, pass, name);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('outbox_token', data.token);
    localStorage.setItem('outbox_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('outbox_token');
    localStorage.removeItem('outbox_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
