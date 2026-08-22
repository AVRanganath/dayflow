'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import { authStore, type AuthUser } from './auth-store';
import { api } from '../api/client';

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (session: { accessToken: string; user: AuthUser }) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(authStore.getUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync state with in-memory auth store
  useEffect(() => {
    const unsubscribe = authStore.subscribe((updatedUser) => {
      setUser(updatedUser);
    });
    return unsubscribe;
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const token = await api.refresh();
      if (token) {
        // If user info is not present, fetch from /employees/me or keep user
        const currentUser = authStore.getUser();
        if (!currentUser) {
          try {
            const profile = await api.get<AuthUser>('/employees/me');
            if (profile) {
              authStore.setUser(profile);
            }
          } catch {
            // Profile fetch optional on boot
          }
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Silent session rehydration on mount
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      try {
        await refreshSession();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, [refreshSession]);

  const login = useCallback((session: { accessToken: string; user: AuthUser }) => {
    authStore.setSession(session.accessToken, session.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Continue client cleanup even if API logout fails
    } finally {
      authStore.clearSession();
      if (typeof window !== 'undefined') {
        window.location.href = '/signin';
      }
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: Boolean(user && authStore.getAccessToken()),
    login,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
