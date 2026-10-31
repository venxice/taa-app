// ============================================================
// Auth Context - global auth state for the whole app
// ============================================================
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { User, LoginPayload, RegisterPayload, ApiResponse } from '@shared/types';
import { get, post } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<unknown>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await get<{ user: User }>('/auth/me');
      if (res.success && res.data) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // HttpOnly cookies are intentionally invisible to JavaScript. Ask the API
  // whether a session exists; it can refresh the access cookie if needed.
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    try {
      const res = await post<{ user: User }>('/auth/login', payload);

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Login failed');
      }

      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      throw new Error(getErrorMessage(err, 'Invalid username or password'));
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    try {
      const res = await post<ApiResponse<unknown>>('/auth/register', payload);
      if (!res.success) {
        throw new Error(res.message || 'Registration failed');
      }
      return res;
    } catch (err) {
      throw new Error(getErrorMessage(err, 'Registration failed'));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
