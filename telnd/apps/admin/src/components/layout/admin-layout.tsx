'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { setPinPromptHandler, type PinPromptReason, SCREEN_LOCK_KEY, SESSION_TRUST_KEY, markSessionTrusted } from '@/lib/security-pin';
import Sidebar from './sidebar';
import Header from './header';
import LockScreen from './lock-screen';
import PinApproveModal from './pin-approve-modal';

// Screen lock (§14.44): the lock flag lives in localStorage (it survives
// the browser closing) and the session-trust marker in sessionStorage
// (it doesn't) — reopening the browser therefore finds no trust and locks,
// while a plain refresh keeps it and walks in. Both keys and the helper
// that writes them live in lib/security-pin.ts, shared with the auth layer
// that marks a fresh sign-in trusted.
const IDLE_LOCK_MS = 5 * 60 * 1000;

type PinInfo = { pinSet: boolean; pinRequired: boolean };

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
  const [pinInfo, setPinInfo] = useState<PinInfo | null>(null);
  const [pinPrompt, setPinPrompt] = useState<{ reason: PinPromptReason } | null>(null);
  const pinResolveRef = useRef<((pin: string | null) => void) | null>(null);

  // Read the PIN situation as it is right now, or null when the server
  // couldn't be asked — callers decide what null means (a raise fails
  // closed; the idle check simply doesn't lock on a guess).
  const fetchPinInfo = useCallback(async (): Promise<PinInfo | null> => {
    try {
      const res = await api.get<{
        success: boolean;
        data: { pinSet: boolean; enforcedByAdmin: boolean; policyRequired: boolean };
      }>('/api/users/me/pin');
      return {
        pinSet: res.data.pinSet,
        pinRequired: res.data.enforcedByAdmin || res.data.policyRequired,
      };
    } catch {
      return null;
    }
  }, []);

  // Store the answer. Used on every raise: one that can't read fails
  // closed — assume a PIN is on file, so the lock screen verifies instead
  // of offering a setup the server may reject.
  const loadPinInfo = useCallback(async (): Promise<PinInfo> => {
    const next = (await fetchPinInfo()) ?? { pinSet: true, pinRequired: true };
    setPinInfo(next);
    return next;
  }, [fetchPinInfo]);

  // Raise the overlay. The remembered state is blanked first (the lock
  // screen renders its spinner for null — it must never guess) and the
  // server is asked what the situation is *now*. Locking off the
  // mount-time snapshot is what made an enable show "create your PIN"
  // and a disable ask for a PIN nobody had — both only right after a
  // page refresh. The idle check passes in the fresh answer it fetched.
  const raiseLock = useCallback(
    (fresh: PinInfo | null) => {
      localStorage.setItem(SCREEN_LOCK_KEY, '1');
      // A locked tab must prove itself again — drop the trust so a refresh
      // (and certainly a closed browser) comes back locked.
      sessionStorage.removeItem(SESSION_TRUST_KEY);
      setPinInfo(fresh);
      setScreenLock('locked');
      if (!fresh) void loadPinInfo();
    },
    [loadPinInfo],
  );

  // What every event handler calls — it takes no argument on purpose:
  // React hands its MouseEvent to onClick targets, and any optional
  // parameter here would receive the event instead of the state.
  const lockScreenNow = useCallback(() => raiseLock(null), [raiseLock]);

  const unlockScreen = useCallback(() => {
    // PIN verified: this browser session is trusted until it closes.
    markSessionTrusted();
    setScreenLock('unlocked');
  }, []);

  // Resolve the persisted lock + trust state once we're actually in the app.
  // Trusted and not found locked → straight in. Otherwise decide on a fresh
  // read: lock only when there is something to ask (a PIN on file or one
  // required), so reopening a browser without a PIN walks in instead of
  // dropping into a setup nobody started — an unaskable server fails
  // closed. The flag is deliberately NOT cleared on public pages any more:
  // only a completed sign-in (auth-context, via markSessionTrusted) may
  // clear it, so looking at /login from a locked tab can't talk its way
  // past the screen lock.
  useEffect(() => {
    if (isLoading || isPublicPage || !isAuthenticated) return;
    const trusted = sessionStorage.getItem(SESSION_TRUST_KEY) === '1';
    const lockedAtTearDown = localStorage.getItem(SCREEN_LOCK_KEY) === '1';
    if (trusted && !lockedAtTearDown) {
      setScreenLock('unlocked');
      void loadPinInfo();
      return;
    }
    void (async () => {
      const fresh = await fetchPinInfo();
      if (fresh && !(fresh.pinSet || fresh.pinRequired)) {
        // Nothing to ask — walk in and trust this session from here on.
        markSessionTrusted();
        setPinInfo(fresh);
        setScreenLock('unlocked');
        return;
      }
      raiseLock(fresh);
    })();
  }, [isLoading, isPublicPage, isAuthenticated, fetchPinInfo, loadPinInfo, raiseLock]);

  // Idle auto-lock: 5 minutes without touching the app. The timer arms
  // whenever the app is unlocked; whether it actually locks is decided on
  // a fresh read at fire time — remembered state would both skip the lock
  // after an enable done on the Security page and force one after a
  // disable (or another admin's reset), dropping the tab into a setup
  // nobody asked for. No confirmed answer, no lock: an unaskable server
  // is not a reason to trap the tab. Either way the check reschedules
  // itself — the timer used to die after its first fire, so one failed
  // read (a laptop waking, the network settling) silently cancelled every
  // later lock until the next keystroke.
  useEffect(() => {
    if (screenLock !== 'unlocked') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const lockAfterIdle = async () => {
      const fresh = await fetchPinInfo();
      if (cancelled) return;
      if (fresh && (fresh.pinSet || fresh.pinRequired)) {
        raiseLock(fresh);
        return;
      }
      // Nothing to ask, or the server couldn't be reached just then —
      // check again in another cycle instead of going quiet.
      arm();
    };

    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(lockAfterIdle, IDLE_LOCK_MS);
    };
    arm();

    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'];
    events.forEach((ev) => window.addEventListener(ev, arm, { passive: true }));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, arm));
    };
  }, [screenLock, fetchPinInfo, raiseLock]);

  // Locking in one tab locks the others too (the storage event only fires
  // cross-tab, so this tab never reacts to itself). Raised through the
  // same fresh-read path — the other tab may well have changed the PIN on
  // its way to the lock.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SCREEN_LOCK_KEY && e.newValue === '1') lockScreenNow();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [lockScreenNow]);

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
