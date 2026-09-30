'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { setPinPromptHandler, type PinPromptReason } from '@/lib/security-pin';
import Sidebar from './sidebar';
import Header from './header';
import LockScreen from './lock-screen';
import PinApproveModal from './pin-approve-modal';

// Screen lock (§14.44): the flag lives in localStorage so it survives the
// browser closing; it is dropped on the public pages, which is what makes
// a fresh sign-in never ask for a PIN.
const SCREEN_LOCK_KEY = 'telndAdminScreenLocked';
const IDLE_LOCK_MS = 5 * 60 * 1000;

interface AdminLayoutProps {
  children: React.ReactNode;
  primaryLogoLight?: string;
  primaryLogoDark?: string;
}

export default function AdminLayout({
  children,
  primaryLogoLight,
  primaryLogoDark,
}: AdminLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  // Reachable without a session: the login screen, the two-factor screen
  // (sits between login and the app), and the password-set page that
  // emailed links (invite / super-admin regenerate / self) land on.
  const isPublicPage = isLoginPage || pathname === '/2fa' || pathname === '/reset-password';

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Screen lock ──
  // 'unknown' until the persisted flag is read on mount — the app never
  // paints a frame of content that a lock should be covering.
  const [screenLock, setScreenLock] = useState<'unknown' | 'unlocked' | 'locked'>('unknown');
  const [pinInfo, setPinInfo] = useState<{ pinSet: boolean; pinRequired: boolean } | null>(null);
  const [pinPrompt, setPinPrompt] = useState<{ reason: PinPromptReason } | null>(null);
  const pinResolveRef = useRef<((pin: string | null) => void) | null>(null);

  const loadPinInfo = useCallback(async () => {
    try {
      const res = await api.get<{
        success: boolean;
        data: { pinSet: boolean; enforcedByAdmin: boolean; policyRequired: boolean };
      }>('/api/users/me/pin');
      setPinInfo({
        pinSet: res.data.pinSet,
        pinRequired: res.data.enforcedByAdmin || res.data.policyRequired,
      });
    } catch {
      // Fail closed: assume a PIN is on file, so the lock screen asks for
      // a verification instead of offering a setup the server may reject.
      setPinInfo({ pinSet: true, pinRequired: true });
    }
  }, []);

  // Resolve the persisted lock + PIN state once we're actually in the app.
  useEffect(() => {
    if (isLoading || isPublicPage || !isAuthenticated) return;
    setScreenLock(localStorage.getItem(SCREEN_LOCK_KEY) === '1' ? 'locked' : 'unlocked');
    void loadPinInfo();
  }, [isLoading, isPublicPage, isAuthenticated, loadPinInfo]);

  // A visit to a public page (login / 2fa / reset-password) is a fresh
  // sign-in — drop the previous session's lock, per the rule that logging
  // in never asks for a PIN.
  useEffect(() => {
    if (!isPublicPage) return;
    localStorage.removeItem(SCREEN_LOCK_KEY);
  }, [isPublicPage]);

  const lockScreenNow = useCallback(() => {
    localStorage.setItem(SCREEN_LOCK_KEY, '1');
    setScreenLock('locked');
  }, []);

  const unlockScreen = useCallback(() => {
    localStorage.removeItem(SCREEN_LOCK_KEY);
    setScreenLock('unlocked');
  }, []);

  // Idle auto-lock: 5 minutes without touching the app. Only meaningful
  // when there is a PIN to ask for (or a demanded one to create).
  useEffect(() => {
    if (screenLock !== 'unlocked') return;
    if (!pinInfo || (!pinInfo.pinSet && !pinInfo.pinRequired)) return;

    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(lockScreenNow, IDLE_LOCK_MS);
    };
    arm();
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'];
    events.forEach((ev) => window.addEventListener(ev, arm, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, arm));
    };
  }, [screenLock, pinInfo, lockScreenNow]);

  // Locking in one tab locks the others too (the storage event only fires
  // cross-tab, so this tab never reacts to itself).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SCREEN_LOCK_KEY && e.newValue === '1') setScreenLock('locked');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // The API layer's PIN challenge resolves through this modal.
  useEffect(() => {
    setPinPromptHandler(
      (reason) =>
        new Promise<string | null>((resolve) => {
          pinResolveRef.current = resolve;
          setPinPrompt({ reason });
        }),
    );
    return () => setPinPromptHandler(null);
  }, []);

  const closePinPrompt = useCallback((pin: string | null) => {
    setPinPrompt(null);
    const resolve = pinResolveRef.current;
    pinResolveRef.current = null;
    resolve?.(pin);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isPublicPage) router.replace('/login');
    if (isAuthenticated && isLoginPage) router.replace('/');
    // A signed-in visitor has nothing to challenge — the pending cookie
    // only exists mid-sign-in.
    if (isAuthenticated && pathname === '/2fa') router.replace('/');
  }, [isAuthenticated, isLoading, router, pathname, isLoginPage, isPublicPage]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleToggleSidebar = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const handleToggleMobile = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{
          display: 'inline-block',
          width: 32,
          height: 32,
          border: '3px solid #e2e5ea',
          borderTopColor: '#034548',
          borderRadius: '50%',
          animation: 'dt-spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes dt-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Login and the set-password page render just the children (no sidebar/
  // header); both work without a session. The useEffect above handles
  // redirect to / when authenticated on the login page.
  if (isPublicPage) {
    // Signed-in visitors get routed home by that same effect — the login
    // form and the two-factor challenge only make sense mid-sign-in. Paint
    // nothing until the navigation lands, or the screen flashes first.
    if (isAuthenticated && (isLoginPage || pathname === '/2fa')) return null;
    return <>{children}</>;
  }

  if (!isAuthenticated) return null;

  // The lock flag hasn't been read yet — show the spinner, never a frame
  // of content a lock is about to cover.
  if (screenLock === 'unknown') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{
          display: 'inline-block',
          width: 32,
          height: 32,
          border: '3px solid #e2e5ea',
          borderTopColor: '#034548',
          borderRadius: '50%',
          animation: 'dt-spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes dt-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="admin-body">
      <Header
        onToggleSidebar={handleToggleSidebar}
        collapsed={collapsed}
        onToggleMobile={handleToggleMobile}
        primaryLogoLight={primaryLogoLight}
        primaryLogoDark={primaryLogoDark}
      />
      <div className="admin-layout">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={handleCloseMobile}
          onLock={lockScreenNow}
        />
        <main className="admin-content">
          {children}
        </main>
      </div>

      {/* Sensitive-action approval (opened by the API layer's challenge). */}
      {pinPrompt && (
        <PinApproveModal
          reason={pinPrompt.reason}
          onApproved={(pin) => closePinPrompt(pin)}
          onCancel={() => closePinPrompt(null)}
        />
      )}

      {/* The lock itself sits above everything, including the modals. */}
      {screenLock === 'locked' && (
        <LockScreen
          pinSet={pinInfo?.pinSet ?? null}
          onPinSet={() => void loadPinInfo()}
          onUnlocked={unlockScreen}
        />
      )}
    </div>
  );
}
