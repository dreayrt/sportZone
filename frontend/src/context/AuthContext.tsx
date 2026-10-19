'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '@/lib/api';

export interface LinkedSocialAccount {
  id: number;
  provider: 'google' | 'facebook';
  provider_id: string;
  provider_email: string | null;
  provider_name: string | null;
  provider_avatar: string | null;
}

export interface AuthUser {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: 'customer' | 'owner' | 'admin';
  status: 'active' | 'blocked';
  avatar?: string | null;
  has_password?: boolean;
  socialAccounts?: LinkedSocialAccount[];
  points?: {
    total_points: number;
    lifetime_points: number;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
  referral_code?: {
    code: string;
    total_referrals: number;
    total_rewards: number;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, userData: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.auth.me();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        removeStoredToken();
        setUser(null);
      }
    } catch {
      // Offline fallback: try reading cached user data if any
      const cached = localStorage.getItem('sz_user_data');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (token: string, userData: AuthUser) => {
    setStoredToken(token);
    localStorage.setItem('sz_user_data', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Continue cleanup
    } finally {
      // Xóa session local trước, rồi về trang chủ
      removeStoredToken();
      setUser(null);
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
