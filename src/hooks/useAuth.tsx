'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email?: string;
  signature?: string;
  role: 'admin' | 'user';
  avatar?: string;
  streak_days: number;
  total_study_time: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);
  const pendingLoginRef = useRef(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.getCurrentUser();
      if (res.success) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 只在首次加载时获取用户信息
  useEffect(() => {
    if (!initRef.current && !pendingLoginRef.current) {
      initRef.current = true;
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const login = async (username: string, password: string) => {
    pendingLoginRef.current = true;
    try {
      const res = await authApi.login(username, password);
      if (res.success) {
        setUser(res.data);
        setLoading(false);
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch {
      return { success: false, error: 'Network error' };
    } finally {
      pendingLoginRef.current = false;
    }
  };

  const register = async (username: string, password: string, email?: string) => {
    pendingLoginRef.current = true;
    try {
      const res = await authApi.register(username, password, email);
      if (res.success) {
        setUser(res.data);
        setLoading(false);
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch {
      return { success: false, error: 'Network error' };
    } finally {
      pendingLoginRef.current = false;
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
