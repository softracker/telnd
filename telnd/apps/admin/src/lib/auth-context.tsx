'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from './api';

interface AdminRole {
  name: string;
  permissions: unknown;
}

interface User {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: string;
  avatar: string | null;
  adminRole?: AdminRole | null;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  logout: () => void;
  /** Flat "resource.action" grants of the current admin's role (["*"] for super admins). */
  permissions: string[];
  /** Current admin's panel role name, or null. */
  roleName: string | null;
  /** True when the role holds the "*" wildcard. */
  isFullAccess: boolean;
  /** Check a single "resource.action" grant (wildcard passes everything). */
  can: (permission: string) => boolean;
  /** Re-fetch the current user (name/email/role) from the API. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = 'telnd_admin_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  const permissions: string[] = useMemo(() => {
    const raw = user?.adminRole?.permissions;
    return Array.isArray(raw) ? (raw.filter((p): p is string => typeof p === 'string')) : [];
  }, [user]);

  const roleName = user?.adminRole?.name ?? null;
  const isFullAccess = permissions.includes('*');

  const can = useCallback(
    (permission: string) => permissions.includes('*') || permissions.includes(permission),
    [permissions],
  );

  const persistUser = useCallback((next: User) => {
    setUser(next);
    localStorage.setItem(USER_KEY, JSON.stringify(next));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<{ success: boolean; data: User }>('/api/auth/me');
      if (response.success && response.data) {
        persistUser(response.data);
      }
    } catch (err) {
      // 401/403 means the session is gone server-side (account suspended —
      // suspend revokes sessions and refresh tokens — signed out elsewhere,
      // or deleted). Drop the cached identity on this page load so
      // AdminLayout redirects to /login: the next refresh logs them out.
      // Any other failure (API restarting, offline) keeps the cached user.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        localStorage.removeItem(USER_KEY);
        setUser(null);
      }
    }
  }, [persistUser]);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        // Refresh in the background so name/email/role stay current.
        void refreshUser();
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string, turnstileToken?: string) => {
    const response = await api.post<AuthResponse>('/api/auth/login', {
      email,
      password,
      ...(turnstileToken ? { turnstileToken } : {}),
    });

    const { user: userData } = response.data;

    // Token and refresh token are set as HttpOnly cookies by the server
    // Store only user metadata in localStorage for UI display
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    setUser(userData);
    router.replace('/');
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // Logout even if request fails
    }

    localStorage.removeItem(USER_KEY);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        permissions,
        roleName,
        isFullAccess,
        can,
        refreshUser,
      }}
    >
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
