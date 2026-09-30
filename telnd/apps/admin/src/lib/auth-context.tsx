'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from './api';
import { markSessionTrusted } from './security-pin';

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
  /** Mobile number — where SMS 2FA codes are delivered (null = none). */
  phone?: string | null;
  adminRole?: AdminRole | null;
}

interface AuthResponse {
  success: boolean;
  data: {
    user?: User;
    // Set instead of `user` when the password was right but the sign-in
    // stops at the two-factor gate (the pending challenge lives in its own
    // cookie; the /2fa screen completes it).
    requires2FA?: boolean;
    requires2FAEnrollment?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  logout: () => void;
  /**
   * Finish a sign-in that passed the two-factor gate: the /2fa screen
   * calls this with the user the verify endpoint returned.
   */
  completeLogin: (user: User) => void;
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

    // Password was right but 2FA is on (or required and not yet set up):
    // no session cookie yet — hand off to the /2fa screen, which completes
    // the challenge against the pending cookie the server just set.
    if (response.data.requires2FA) {
      router.replace('/2fa');
      return;
    }

    const { user: userData } = response.data;
    if (!userData) return;

    // Token and refresh token are set as HttpOnly cookies by the server
    // Store only user metadata in localStorage for UI display
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    setUser(userData);
    // Fresh sign-in: this browser session may enter without a PIN, and any
    // lock the previous session left behind drops here — never on a mere
    // visit to /login, only on a completed sign-in.
    markSessionTrusted();
    router.replace('/');
  }, [router]);

  const completeLogin = useCallback((nextUser: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    // The two-factor gate just completed — a full sign-in, same trust as
    // a password-only login.
    markSessionTrusted();
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
        completeLogin,
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
