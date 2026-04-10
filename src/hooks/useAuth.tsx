'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email?: string;
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
  const [initialized, setInitialized] = useState(false);

  const refreshUser = useCallback(async () => {
    const res = await authApi.getCurrentUser();
    if (res.success) {
      setUser(res.data);
    } else {
      setUser(null);
    }
  }, []);

  // 只在首次加载时获取用户信息
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      refreshUser().finally(() => {
        setLoading(false);
      });
    }
  }, [initialized, refreshUser]);

  const login = async (username: string, password: string) => {
    try {
      const res = await authApi.login(username, password);
      if (res.success) {
        setUser(res.data);
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (username: string, password: string, email?: string) => {
    const res = await authApi.register(username, password, email);
    if (res.success) {
      setUser(res.data);
      return { success: true };
    }
    return { success: false, error: res.error };
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
