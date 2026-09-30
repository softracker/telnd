'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';
import { OtpInput, otpBoxStyle, otpErrorBoxStyle, otpErrorFocusStyle, otpFocusStyle } from '@/components/otp-input';
import { PIN_CHANGED_EVENT, announcePinChange } from '@/lib/security-pin';
import { type TranslationKey } from '@/lib/translations';

interface DeviceSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  location: string | null;
  countryCode: string | null;
  isCurrent: boolean;
}

interface SecurityData {
  lastLoginAt: string | null;
  lastLoginLocation: string | null;
  lastLoginCountryCode: string | null;
  sessions: DeviceSession[];
}

// GET /api/users/me/2fa — everything the card renders. canDisable and
// canManagePolicy are decided server-side: an account someone else
// required 2FA for (or the global policy) can't be released here, and
// only a super admin sees the policy switch.
interface TwoFaState {
  enabled: boolean;
  method: 'totp' | 'sms' | 'email' | null;
  pendingSetup: boolean;
  hasPhone: boolean;
  phoneMasked: string | null;
  smsAvailable: boolean;
  smsConfigured: boolean;
  emailMasked: string | null;
  emailAvailable: boolean;
  emailConfigured: boolean;
  enforcedByAdmin: boolean;
  policyRequired: boolean;
  canDisable: boolean;
  canManagePolicy: boolean;
  /** Unused recovery codes still on file (0 = regenerate is the only fix). */
  recoveryCodesRemaining: number;
}

interface PinState {
  pinSet: boolean;
  enforcedByAdmin: boolean;
  policyRequired: boolean;
  canManagePolicy: boolean;
}

interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      style={{ animation: 'spin 0.7s linear infinite' }}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.8" />
    </svg>
  );
}

// "12 minutes ago" / "৫ দিন আগে" — Intl.RelativeTimeFormat handles both
// locales, so no per-unit translation keys are needed.
function relativeTime(iso: string, language: string): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  return rtf.format(Math.round(diffSec / 2592000), 'month');
}

function absoluteTime(iso: string, language: string): string {
  return new Date(iso).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Browser + OS + form factor parsed from the stored user-agent. Unknown or
// missing agents fall back to "Not recorded" instead of a raw UA string.
// Regional-indicator emoji built from an ISO-3166 alpha-2 code
// ("BD" → 🇧🇩) — flags are generated at runtime so no glyph ever
// lands in translations.ts (ASCII-only rule).
function countryFlag(code: string | null | undefined): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
  const up = code.toUpperCase();
  return String.fromCodePoint(0x1f1e6 + up.charCodeAt(0) - 65, 0x1f1e6 + up.charCodeAt(1) - 65);
}

function describeDevice(ua: string | null, t: (key: TranslationKey) => string): { name: string; icon: string } {
  if (!ua) return { name: t('security.notRecorded'), icon: '💻' };
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : null;
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android'
    : /Linux/.test(ua) ? 'Linux'
    : null;
  if (!browser && !os) return { name: t('security.notRecorded'), icon: '💻' };
  const icon = /Mobile|iPhone|iPad|Android|Silk/.test(ua) ? '📱' : '💻';
  const name = browser && os ? `${browser} on ${os}` : browser || os;
  return { name: name as string, icon };
}

// "This device" pill — used on the Last login card and the current row.
const pillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.125rem 0.5rem',
  borderRadius: '999px',
  backgroundColor: 'var(--accent-light)',
  color: 'var(--accent)',
  fontSize: '0.6875rem',
  fontWeight: 600,
} as const;

// Shared button look for the two-factor card (matches the regenerate
// button above; armed state is applied at the call site).
const tfBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.625rem 1rem',
  borderRadius: '8px',
  backgroundColor: 'var(--secondary-btn-bg)',
  color: 'var(--text-main)',
  border: '1px solid var(--border-color)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s',
} as const;

export default function SecuritySettingsPage() {
  const { t, language } = useLanguage();

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);
  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  // ── Sessions / trusted devices ──
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SecurityData | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: SecurityData }>('/api/users/me/sessions');
      setData(res.data);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Change password ──
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  // Armed after a failed submit: each inline error clears itself the moment
  // its condition is fixed (mirrors the confirm-email pattern on Account).
  const [currentWrong, setCurrentWrong] = useState(false);
  const [shortArmed, setShortArmed] = useState(false);
  const [mismatchArmed, setMismatchArmed] = useState(false);
  // Same-as-current: armed by the client-side pre-check (skips the pointless
  // round trip) and by the API's SAME_PASSWORD 400 (the server is the
  // authority). Like the *Armed flags it self-clears in the render
  // condition the moment either field stops matching.
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    const short = next.length < 8;
    const mismatch = confirm !== next;
    const same = next.length > 0 && next === current;
    setShortArmed(short);
    setMismatchArmed(mismatch);
    setSameAsCurrent(same);
    if (short || mismatch || same) return;

    setSaving(true);
    try {
      await api.post('/api/users/me/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      setCurrent('');
      setNext('');
      setConfirm('');
      setCurrentWrong(false);
      setShortArmed(false);
      setMismatchArmed(false);
      setSameAsCurrent(false);
      showToast('success', t('security.passwordChanged'));
    } catch (err) {
      if (err instanceof ApiError && (err.data as any)?.error?.code === 'INVALID_CURRENT_PASSWORD') {
        setCurrentWrong(true);
      } else if (err instanceof ApiError && (err.data as any)?.error?.code === 'SAME_PASSWORD') {
        setSameAsCurrent(true);
      } else {
        showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Regenerate (two-click confirm, like every other destructive action) ──
  const [pendingRegen, setPendingRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    if (!pendingRegen) {
      setPendingRegen(true);
      return;
    }
    setPendingRegen(false);
    setRegenerating(true);
    try {
      await api.post('/api/users/me/regenerate-password', {});
      showToast('success', t('security.regeneratedSelf'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setRegenerating(false);
    }
  }

  // ── Device revocation (two-click confirm as well) ──
  const [pendingSignOut, setPendingSignOut] = useState<string | null>(null);
  const [pendingSignOutAll, setPendingSignOutAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  async function handleSignOut(s: DeviceSession) {
    if (pendingSignOut !== s.id) {
      setPendingSignOut(s.id);
      return;
    }
    setPendingSignOut(null);
    setRevokingId(s.id);
    try {
      await api.delete(`/api/users/me/sessions/${s.id}`);
      showToast('success', t('security.deviceSignedOut'));
      await loadSessions();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setRevokingId(null);
    }
  }

  async function handleSignOutOthers() {
    if (!pendingSignOutAll) {
      setPendingSignOutAll(true);
      return;
    }
    setPendingSignOutAll(false);
    setRevokingAll(true);
    try {
      await api.delete('/api/users/me/sessions');
      showToast('success', t('security.othersSignedOut'));
      await loadSessions();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setRevokingAll(false);
    }
  }

  // ── Two-factor authentication ──
  const [twoFa, setTwoFa] = useState<TwoFaState | null>(null);
  const [twoFaBusy, setTwoFaBusy] = useState<'setup' | 'send' | 'enable' | 'disable' | 'policy' | 'codes' | null>(null);
  // Which enrollment panel is open: authenticator app (QR) or SMS delivery.
  const [setupPanel, setSetupPanel] = useState<'totp' | 'sms' | 'email' | null>(null);
  const [setup, setSetup] = useState<{ otpauthUri: string; secret: string } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableCredential, setDisableCredential] = useState('');
  // The global "require 2FA for all admins" switch arms like every other
  // destructive toggle on this panel: first click confirms, second acts.
  const [policyArmed, setPolicyArmed] = useState(false);
  // ── Security PIN (§14.44) ──
  const [pinState, setPinState] = useState<PinState | null>(null);
  const [pinBusy, setPinBusy] = useState<'setup' | 'policy' | 'disable' | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  // A wrong confirm paints that row's boxes red and puts the caret back
  // in the first one instead of spelling it out — the next digit clears
  // the colour. Server messages (e.g. PIN_EXISTS) keep their text.
  const [pinWrong, setPinWrong] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  // The global "require a security PIN" switch arms like every other hard
  // toggle here: first click confirms, second acts.
  const [pinPolicyArmed, setPinPolicyArmed] = useState(false);
  // Turning the PIN off arms the same way — and the server then wants the
  // PIN itself before it deletes anything.
  const [pinDisableArmed, setPinDisableArmed] = useState(false);
  // Fresh recovery codes from the last enable/regenerate: shown once, only
  // until this panel is acknowledged. Never refetched — the server keeps
  // hashes only, so this state is the sole copy.
  const [savedCodes, setSavedCodes] = useState<string[] | null>(null);
  const [codesArmed, setCodesArmed] = useState(false);
  const [codesSavedOk, setCodesSavedOk] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);

  const loadTwoFa = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: TwoFaState }>('/api/users/me/2fa');
      setTwoFa(res.data);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    }
  }, [showToast, t]);

  useEffect(() => {
    loadTwoFa();
  }, [loadTwoFa]);

  const loadPin = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: PinState }>('/api/users/me/pin');
      setPinState(res.data);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadPin();
  }, [loadPin]);

  // Re-sync whenever the tab comes back into view. A backgrounded tab (or a
  // back/forward-cache restore) can hold this card from before an enable or
  // disable that happened elsewhere — the pill must never go stale.
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible') {
        void loadTwoFa();
        void loadPin();
      }
    };
    // A back/forward-cache restore replays an old snapshot without ever
    // re-running the mount effect — catch that path too.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        void loadTwoFa();
        void loadPin();
      }
    };
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [loadTwoFa, loadPin]);

  // The lock overlay above this panel can create the PIN (its setup form)
  // or learn it was reset elsewhere — either way this card's own snapshot
  // goes stale without any page reload, so listen for the announcement
  // and re-read. Our own setup/disable handlers also announce; the extra
  // read here is the same cheap GET they were about to make anyway.
  useEffect(() => {
    const onChange = () => void loadPin();
    window.addEventListener(PIN_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(PIN_CHANGED_EVENT, onChange);
  }, [loadPin]);

  // SMS resend countdown — one tick per second while it runs.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  function closeSetupPanel() {
    setSetupPanel(null);
    setSetup(null);
    setTwoFaCode('');
    setCodeSent(false);
    setResendIn(0);
  }

  async function handleStartTotpSetup() {
    setTwoFaBusy('setup');
    try {
      const res = await api.post<{ success: boolean; data: { otpauthUri: string; secret: string } }>(
        '/api/users/me/2fa/setup',
        {},
      );
      setSetup(res.data);
      setSetupPanel('totp');
      setTwoFaCode('');
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setTwoFaBusy(null);
    }
  }

  async function handleSendCode() {
    setTwoFaBusy('send');
    try {
      // The panels are channel-specific; the server also derives the
      // channel for an already-enabled account, but enrollment hasn't
      // stored a method yet, so the panel says which one it is.
      await api.post('/api/users/me/2fa/send', { method: setupPanel === 'email' ? 'email' : 'sms' });
      setCodeSent(true);
      setResendIn(45);
      showToast('success', t('twoFactor.sentToast'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setTwoFaBusy(null);
    }
  }

  async function handleEnable(e: FormEvent) {
    e.preventDefault();
    await runEnable(twoFaCode);
  }

  // Shared by the form's submit and the OTP row's onComplete, which hands
  // the sixth digit over directly — reading `twoFaCode` state there would
  // race the re-render.
  async function runEnable(value: string) {
    if (value.length !== 6 || !setupPanel || twoFaBusy) return;
    setTwoFaBusy('enable');
    try {
      const res = await api.post<{ success: boolean; data: { recoveryCodes?: string[] } }>(
        '/api/users/me/2fa/enable',
        { method: setupPanel, code: value },
      );
      // The one showing of the fresh set: the save panel replaces the
      // setup panel below until it is acknowledged.
      if (res.data.recoveryCodes && res.data.recoveryCodes.length > 0) {
        setSavedCodes(res.data.recoveryCodes);
        setCodesSavedOk(false);
        setCodesCopied(false);
      }
      // Flip the card straight from the confirmed response — the pill and
      // the enable/disable options switch immediately and never depend on
      // the follow-up refetch succeeding.
      setTwoFa((prev) =>
        prev
          ? {
              ...prev,
              enabled: true,
              method: setupPanel,
              pendingSetup: false,
              canDisable: !prev.enforcedByAdmin && !prev.policyRequired,
            }
          : prev,
      );
      showToast('success', t('twoFactor.enabledToast'));
      closeSetupPanel();
      await loadTwoFa();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
      // The write may have landed even if the response didn't (dropped
      // connection) — re-sync so the card can't disagree with the server.
      void loadTwoFa();
    } finally {
      setTwoFaBusy(null);
    }
  }

  async function handleDisable(e: FormEvent) {
    e.preventDefault();
    const value = disableCredential.trim();
    if (!value || twoFaBusy) return;
    // A six-digit value is a live verification code; passwords are at least
    // 8 characters, so the two shapes can never collide.
    const body = /^\d{6}$/.test(value) ? { code: value } : { password: value };
    setTwoFaBusy('disable');
    try {
      await api.post('/api/users/me/2fa/disable', body);
      // The server deleted the codes with the factor they belonged to —
      // drop any panel still showing the old set.
      setSavedCodes(null);
      setCodesArmed(false);
      setTwoFa((prev) =>
        prev ? { ...prev, enabled: false, method: null, pendingSetup: false, canDisable: false } : prev,
      );
      showToast('success', t('twoFactor.disabledToast'));
      setDisableOpen(false);
      setDisableCredential('');
      await loadTwoFa();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
      void loadTwoFa();
    } finally {
      setTwoFaBusy(null);
    }
  }

  // Rotate the recovery-code set. Two-click like every other revoking
  // action on this panel: the first press warns (the old codes die), the
  // second performs it and shows the new set once.
  async function handleRegenerateCodes() {
    if (!twoFa || twoFaBusy) return;
    if (!codesArmed) {
      setCodesArmed(true);
      return;
    }
    setCodesArmed(false);
    setTwoFaBusy('codes');
    try {
      const res = await api.post<{ success: boolean; data: { recoveryCodes: string[] } }>(
        '/api/users/me/2fa/recovery-codes',
        {},
      );
      setSavedCodes(res.data.recoveryCodes);
      setCodesSavedOk(false);
      setCodesCopied(false);
      showToast('success', t('twoFactor.codesRotatedToast'));
      await loadTwoFa();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
      void loadTwoFa();
    } finally {
      setTwoFaBusy(null);
    }
  }

  async function handlePolicyToggle() {
    if (!twoFa || twoFaBusy) return;
    if (!policyArmed) {
      setPolicyArmed(true);
      return;
    }
    setPolicyArmed(false);
    const next = !twoFa.policyRequired;
    setTwoFaBusy('policy');
    try {
      await api.post('/api/admin/two-factor-policy', { required: next });
      showToast('success', next ? t('twoFactor.policyToastOn') : t('twoFactor.policyToastOff'));
      await loadTwoFa();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setTwoFaBusy(null);
    }
  }

  // ── Security PIN setup (§14.44) ──
  // Creation only: a forgotten PIN comes off through an admin's reset, so
  // this form never replaces an existing one (the server answers 409 and
  // the reload flips the card to its "set" state). The two digits are
  // handed in rather than read from state: a row's onComplete runs in the
  // same batch as its onChange, when the state variable is still the old
  // value — the other row's state is fresh because it was filled earlier.
  async function runPinSetup(pin: string, confirm: string) {
    if (pinBusy) return;
    setPinError(null);
    // The rows passed validation — drop any wrong-entry red before the
    // request goes out.
    setPinWrong(false);
    setPinBusy('setup');
    try {
      await api.post('/api/users/me/pin', { pin });
      announcePinChange();
      setPinValue('');
      setPinConfirm('');
      showToast('success', t('securityPin.savedToast'));
      await loadPin();
    } catch (err) {
      setPinError(err instanceof ApiError ? err.message : t('common.failed'));
      // A PIN may have appeared elsewhere (another tab, a reset race) —
      // re-read so the card can't disagree with the server.
      void loadPin();
    } finally {
      setPinBusy(null);
    }
  }

  // Caret back in the first confirm box once the cleared row has
  // committed — a synchronous focus() would race the state update that
  // empties the row.
  useEffect(() => {
    if (pinWrong) document.getElementById('security-pin-confirm')?.focus();
  }, [pinWrong]);

  function submitPinSetup(pin: string, confirm: string) {
    if (pinBusy) return;
    if (pin.length !== 4) {
      setPinError(t('securityPin.pinDigits'));
      return;
    }
    if (confirm.length !== 4 || confirm !== pin) {
      // Wrong confirm: same treatment as a wrong verify — the confirm
      // boxes go red and nothing is spelled out; the effect above puts
      // the caret back in their first box.
      setPinConfirm('');
      setPinWrong(true);
      setPinError(null);
      return;
    }
    void runPinSetup(pin, confirm);
  }

  // Super admin: "require a security PIN for all admins" — two-click arm,
  // same as the two-factor policy switch above.
  async function handlePinPolicyToggle() {
    if (!pinState || pinBusy) return;
    if (!pinPolicyArmed) {
      setPinPolicyArmed(true);
      return;
    }
    setPinPolicyArmed(false);
    const next = !pinState.policyRequired;
    setPinBusy('policy');
    try {
      await api.post('/api/admin/pin-policy', { required: next });
      announcePinChange();
      showToast('success', next ? t('securityPin.policyToastOn') : t('securityPin.policyToastOff'));
      await loadPin();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setPinBusy(null);
    }
  }

  // Self-service: turn the PIN off. Two-click arm like every other hard
  // toggle on this panel; the DELETE then passes through the central PIN
  // interception, so the approval modal proves the digits before the
  // server drops anything (and refuses outright while a requirement stands).
  async function handlePinDisable() {
    if (pinBusy) return;
    if (!pinDisableArmed) {
      setPinDisableArmed(true);
      return;
    }
    setPinDisableArmed(false);
    setPinBusy('disable');
    try {
      await api.delete('/api/users/me/pin');
      announcePinChange();
      showToast('success', t('securityPin.disabledToast'));
      await loadPin();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
      // A requirement may have landed while the prompt was open — re-read
      // so the card flips to its notice instead of offering a doomed button.
      void loadPin();
    } finally {
      setPinBusy(null);
    }
  }

  // Inline errors on the "new password" field: same-as-current wins over
  // too-short (the more specific complaint); both re-evaluate every render,
  // so editing either password field clears them without extra handlers.
  const sameErr = sameAsCurrent && next === current;
  const shortErr = shortArmed && next.length < 8;

  const lastLoginAt = data ? data.lastLoginAt ?? data.sessions[0]?.createdAt ?? null : null;
  const lastSession = data?.sessions[0];
  const prevSession = data?.sessions[1];

  // "This device" pins to the top of the logged-in devices list. The sort
  // is stable, so within each group the server's newest-first order holds —
  // and data.sessions itself stays untouched, because lastLoginAt and
  // lastSession above must keep referring to the actual newest sign-in.
  const displaySessions = data
    ? [...data.sessions].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent))
    : [];
  const hasOthers = !!data?.sessions.some((s) => !s.isCurrent);

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('security.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('security.description')}
      </p>

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Spinner size={18} />
          </div>
          {t('common.loading')}
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── Password + Last login side by side; stack on narrow screens ── */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ flex: '1 1 380px', minWidth: 0 }}>
              <Section title={t('security.passwordTitle')} description={t('security.passwordDesc')}>
                <form onSubmit={handleChangePassword}>
                  <PasswordInput
                    label={t('security.currentPassword')}
                    value={current}
                    onChange={(v) => {
                      setCurrent(v);
                      setCurrentWrong(false);
                    }}
                    required
                    autoComplete="current-password"
                    error={currentWrong ? t('security.currentPasswordWrong') : undefined}
                  />
                  <PasswordInput
                    label={t('security.newPassword')}
                    value={next}
                    onChange={setNext}
                    required
                    autoComplete="new-password"
                    error={sameErr ? t('security.passwordSameAsCurrent') : shortErr ? t('security.passwordTooShort') : undefined}
                    helperText={!(sameErr || shortErr) ? t('security.passwordHint') : undefined}
                  />
                  <PasswordInput
                    label={t('security.confirmPassword')}
                    value={confirm}
                    onChange={setConfirm}
                    required
                    autoComplete="new-password"
                    error={mismatchArmed && confirm !== next ? t('security.passwordMismatch') : undefined}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <SaveButton saving={saving} label={t('security.changePassword')} />
                  </div>
                </form>

                {/* ── or ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.125rem 0 0.75rem' }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-color)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('security.or')}</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-color)' }} />
                </div>

                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating || saving}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: pendingRegen ? 'var(--accent-light)' : 'var(--secondary-btn-bg)',
                    color: pendingRegen ? 'var(--accent)' : 'var(--text-main)',
                    border: pendingRegen ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: regenerating || saving ? 'not-allowed' : 'pointer',
                    opacity: regenerating || saving ? 0.7 : 1,
                    transition: 'background-color 0.15s',
                  }}
                >
                  {regenerating ? (
                    <Spinner size={14} />
                  ) : pendingRegen ? (
                    t('account.confirmStatus')
                  ) : (
                    t('security.regenerateSelf')
                  )}
                </button>
              </Section>
            </div>

            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <Section title={t('security.lastLoginTitle')} description={t('security.lastLoginDesc')}>
                {!lastLoginAt ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{t('security.noLoginInfo')}</p>
                ) : (
                  <>
                    <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {relativeTime(lastLoginAt, language)}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.125rem',
                        marginBottom: '0.875rem',
                      }}
                    >
                      {absoluteTime(lastLoginAt, language)}
                    </div>
                    {(data?.lastLoginLocation ?? lastSession?.location) && (
                      <InfoRow
                        label={t('security.locationLabel')}
                        value={`${countryFlag(data?.lastLoginCountryCode ?? lastSession?.countryCode)} ${
                          data?.lastLoginLocation ?? lastSession?.location ?? ''
                        }`.trim()}
                      />
                    )}
                    <InfoRow
                      label={t('security.ipLabel')}
                      value={lastSession?.ipAddress ?? t('security.notRecorded')}
                    />
                    <InfoRow
                      label={t('security.deviceLabel')}
                      value={describeDevice(lastSession?.userAgent ?? null, t).name}
                    />
                    {lastSession?.isCurrent && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <span style={pillStyle}>{t('security.thisDevice')}</span>
                      </div>
                    )}
                    {prevSession && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          paddingTop: '0.625rem',
                          borderTop: '1px solid var(--border-color)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {t('security.earlierLogin')} · {absoluteTime(prevSession.createdAt, language)}
                      </div>
                    )}
                  </>
                )}
              </Section>
            </div>
          </div>

          {/* ── Two-factor authentication ── */}
          {twoFa && (
            <div style={{ marginBottom: '1rem' }}>
              <Section title={t('twoFactor.cardTitle')} description={t('twoFactor.cardDesc')}>
                {/* Status line — enabled (green) / setup required (accent) /
                    off (neutral). */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.1875rem 0.625rem',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: twoFa.enabled
                        ? 'var(--success-bg)'
                        : twoFa.enforcedByAdmin || twoFa.policyRequired
                          ? 'var(--accent-light)'
                          : 'var(--secondary-btn-bg)',
                      color: twoFa.enabled
                        ? 'var(--success-text)'
                        : twoFa.enforcedByAdmin || twoFa.policyRequired
                          ? 'var(--accent)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {twoFa.enabled
                      ? t('twoFactor.statusOn')
                      : twoFa.enforcedByAdmin || twoFa.policyRequired
                        ? t('twoFactor.statusRequired')
                        : t('twoFactor.statusOff')}
                  </span>
                  {twoFa.enabled && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {twoFa.method === 'sms'
                        ? t('twoFactor.methodSms')
                        : twoFa.method === 'email'
                          ? t('twoFactor.methodEmail')
                          : t('twoFactor.methodApp')}
                    </span>
                  )}
                </div>

                {/* Recovery codes: how many are unused, plus the two-click
                    regenerate (which revokes every previously saved code).
                    While a fresh set is being shown, the save panel below
                    takes this spot over instead. */}
                {twoFa.enabled && !savedCodes && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: twoFa.recoveryCodesRemaining > 0 ? 'var(--text-muted)' : 'var(--accent)',
                      }}
                    >
                      {twoFa.recoveryCodesRemaining > 0
                        ? t('twoFactor.codesRemaining', { n: twoFa.recoveryCodesRemaining })
                        : t('twoFactor.codesNone')}
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerateCodes}
                      disabled={twoFaBusy !== null}
                      style={{
                        ...tfBtnStyle,
                        padding: '0.375rem 0.75rem',
                        fontSize: '0.75rem',
                        backgroundColor: codesArmed ? 'var(--accent-light)' : 'var(--secondary-btn-bg)',
                        color: codesArmed ? 'var(--accent)' : 'var(--text-main)',
                        border: codesArmed ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                        opacity: twoFaBusy ? 0.7 : 1,
                        cursor: twoFaBusy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {twoFaBusy === 'codes' && <Spinner size={14} />}
                      {twoFaBusy === 'codes'
                        ? t('twoFactor.generating')
                        : codesArmed
                          ? t('common.confirm')
                          : t('twoFactor.generateCodes')}
                    </button>
                  </div>
                )}

                {/* The one showing of a fresh set: plaintext exists only
                    in the response that created it, so this panel is the
                    only place the codes can ever be read. */}
                {savedCodes && savedCodes.length > 0 && (
                  <div
                    style={{
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1rem',
                      marginBottom: '0.875rem',
                    }}
                  >
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.375rem' }}>
                      {t('twoFactor.saveCodesTitle')}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 0.875rem', lineHeight: 1.6 }}>
                      {t('twoFactor.saveCodesDesc')}
                    </p>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '0.5rem',
                        backgroundColor: 'var(--secondary-btn-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        marginBottom: '0.875rem',
                      }}
                    >
                      {savedCodes.map((single, idx) => (
                        <code
                          key={`${idx}-${single}`}
                          style={{
                            textAlign: 'center',
                            fontSize: '0.875rem',
                            letterSpacing: '0.1em',
                            color: 'var(--text-main)',
                            userSelect: 'all',
                          }}
                        >
                          {single}
                        </code>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(savedCodes.join('\n')).then(() => {
                            setCodesCopied(true);
                            setTimeout(() => setCodesCopied(false), 2000);
                          });
                        }}
                        style={tfBtnStyle}
                      >
                        {codesCopied ? t('twoFactor.codesCopied') : t('twoFactor.copyCodes')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const blob = new Blob([`${savedCodes.join('\n')}\n`], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = 'telnd-recovery-codes.txt';
                          link.click();
                          URL.revokeObjectURL(url);
                        }}
                        style={tfBtnStyle}
                      >
                        {t('twoFactor.downloadCodes')}
                      </button>
                    </div>

                    <label
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'flex-start',
                        fontSize: '0.8125rem',
                        color: 'var(--text-main)',
                        marginBottom: '0.875rem',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={codesSavedOk}
                        onChange={(e) => setCodesSavedOk(e.target.checked)}
                        style={{ marginTop: '0.125rem', accentColor: '#0d9488' }}
                      />
                      {t('twoFactor.codesSavedCheck')}
                    </label>

                    <button
                      type="button"
                      disabled={!codesSavedOk}
                      onClick={() => {
                        setSavedCodes(null);
                        setCodesSavedOk(false);
                      }}
                      style={{
                        ...tfBtnStyle,
                        backgroundColor: 'var(--accent)',
                        color: '#ffffff',
                        border: '1px solid var(--accent)',
                        opacity: codesSavedOk ? 1 : 0.6,
                        cursor: codesSavedOk ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {t('twoFactor.codesDone')}
                    </button>
                  </div>
                )}

                {!twoFa.enabled ? (
                  <div>
                    {/* Factor choice — SMS is offered only when a usable
                        number is on file AND the gateway is configured,
                        email only when SMTP is set up; otherwise a
                        plain-text reason sits below the row. */}
                    {!setupPanel && (
                      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleStartTotpSetup}
                          disabled={twoFaBusy !== null}
                          style={{ ...tfBtnStyle, opacity: twoFaBusy ? 0.7 : 1, cursor: twoFaBusy ? 'not-allowed' : 'pointer' }}
                        >
                          {twoFaBusy === 'setup' && <Spinner size={14} />}
                          {t('twoFactor.setupApp')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSetupPanel('sms');
                            setTwoFaCode('');
                            setCodeSent(false);
                          }}
                          disabled={twoFaBusy !== null || !twoFa.smsAvailable || !twoFa.smsConfigured}
                          style={{
                            ...tfBtnStyle,
                            opacity: twoFaBusy || !twoFa.smsAvailable || !twoFa.smsConfigured ? 0.55 : 1,
                            cursor: twoFaBusy || !twoFa.smsAvailable || !twoFa.smsConfigured ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {t('twoFactor.useSms')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSetupPanel('email');
                            setTwoFaCode('');
                            setCodeSent(false);
                          }}
                          disabled={twoFaBusy !== null || !twoFa.emailAvailable || !twoFa.emailConfigured}
                          style={{
                            ...tfBtnStyle,
                            opacity: twoFaBusy || !twoFa.emailAvailable || !twoFa.emailConfigured ? 0.55 : 1,
                            cursor: twoFaBusy || !twoFa.emailAvailable || !twoFa.emailConfigured ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {t('twoFactor.useEmail')}
                        </button>
                      </div>
                    )}
                    {(!twoFa.smsAvailable || !twoFa.smsConfigured) && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.5rem', marginBottom: 0 }}>
                        {!twoFa.smsConfigured ? t('twoFactor.smsNotConfigured') : t('twoFactor.phoneHint')}
                      </p>
                    )}
                    {(!twoFa.emailAvailable || !twoFa.emailConfigured) && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.5rem', marginBottom: 0 }}>
                        {!twoFa.emailConfigured ? t('twoFactor.emailNotConfigured') : t('twoFactor.emailHint')}
                      </p>
                    )}

                    {/* Authenticator-app panel: QR + manual key + proof code. */}
                    {setupPanel === 'totp' && setup && (
                      <form
                        onSubmit={handleEnable}
                        style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', marginTop: '0.75rem' }}
                      >
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 0.875rem', lineHeight: 1.6 }}>
                          {t('twoFactor.qrHelp')}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.875rem' }}>
                          <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', lineHeight: 0 }}>
                            <QRCodeSVG value={setup.otpauthUri} size={156} marginSize={0} />
                          </div>
                        </div>
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                          {t('twoFactor.manualKey')}
                        </span>
                        <code
                          style={{
                            display: 'block',
                            background: 'var(--input-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '0.5rem 0.625rem',
                            fontSize: '0.8125rem',
                            wordBreak: 'break-all',
                            userSelect: 'all',
                            color: 'var(--text-main)',
                            marginBottom: '0.875rem',
                          }}
                        >
                          {setup.secret}
                        </code>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                          {t('twoFactor.codeLabel')}
                        </label>
                        <OtpInput
                          value={twoFaCode}
                          onChange={setTwoFaCode}
                          onComplete={(v) => {
                            void runEnable(v);
                          }}
                          ariaLabel={t('twoFactor.codeLabel')}
                          style={{
                            height: '40px',
                            fontSize: '0.9375rem',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: 'var(--input-border)',
                            backgroundColor: 'var(--input-bg)',
                            color: 'var(--text-main)',
                          }}
                          focusStyle={{ borderColor: 'var(--accent)' }}
                        />
                        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.875rem' }}>
                          <button type="button" onClick={closeSetupPanel} style={tfBtnStyle}>
                            {t('common.cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={twoFaCode.length !== 6 || twoFaBusy !== null}
                            style={{
                              ...tfBtnStyle,
                              backgroundColor: 'var(--accent)',
                              color: '#ffffff',
                              border: '1px solid var(--accent)',
                              opacity: twoFaCode.length !== 6 || twoFaBusy ? 0.7 : 1,
                              cursor: twoFaCode.length !== 6 || twoFaBusy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {twoFaBusy === 'enable' && <Spinner size={14} />}
                            {twoFaBusy === 'enable' ? t('twoFactor.enabling') : t('twoFactor.enable')}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* SMS panel: send → enter the code → enable. */}
                    {setupPanel === 'sms' && (
                      <form
                        onSubmit={handleEnable}
                        style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', marginTop: '0.75rem' }}
                      >
                        {!codeSent ? (
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 0.875rem', lineHeight: 1.6 }}>
                            {t('twoFactor.smsEnrollDesc')}
                          </p>
                        ) : (
                          <>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 0.875rem', lineHeight: 1.6 }}>
                              {t('twoFactor.smsSentTo', { phone: twoFa.phoneMasked || '•••' })}
                            </p>
                            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                              {t('twoFactor.codeLabel')}
                            </label>
                            <OtpInput
                              value={twoFaCode}
                              onChange={setTwoFaCode}
                              onComplete={(v) => {
                                void runEnable(v);
                              }}
                              ariaLabel={t('twoFactor.codeLabel')}
                              autoFocus
                              style={{
                                height: '40px',
                                fontSize: '0.9375rem',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: 'var(--input-border)',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--text-main)',
                              }}
                              focusStyle={{ borderColor: 'var(--accent)' }}
                            />
                            <button
                              type="button"
                              onClick={handleSendCode}
                              disabled={twoFaBusy !== null || resendIn > 0}
                              style={{
                                ...tfBtnStyle,
                                marginTop: '0.625rem',
                                opacity: twoFaBusy || resendIn > 0 ? 0.6 : 1,
                                cursor: twoFaBusy || resendIn > 0 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {resendIn > 0 ? t('twoFactor.resendIn', { sec: resendIn }) : t('twoFactor.resendCode')}
                            </button>
                          </>
                        )}
                        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.875rem' }}>
                          <button type="button" onClick={closeSetupPanel} style={tfBtnStyle}>
                            {t('common.cancel')}
                          </button>
                          {!codeSent && (
                            <button
                              type="button"
                              onClick={handleSendCode}
                              disabled={twoFaBusy !== null}
                              style={{ ...tfBtnStyle, opacity: twoFaBusy ? 0.7 : 1, cursor: twoFaBusy ? 'not-allowed' : 'pointer' }}
                            >
                              {twoFaBusy === 'send' && <Spinner size={14} />}
                              {twoFaBusy === 'send' ? t('twoFactor.sending') : t('twoFactor.sendCode')}
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={twoFaCode.length !== 6 || twoFaBusy !== null}
                            style={{
                              ...tfBtnStyle,
                              backgroundColor: 'var(--accent)',
                              color: '#ffffff',
                              border: '1px solid var(--accent)',
                              opacity: twoFaCode.length !== 6 || twoFaBusy ? 0.7 : 1,
                              cursor: twoFaCode.length !== 6 || twoFaBusy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {twoFaBusy === 'enable' && <Spinner size={14} />}
                            {twoFaBusy === 'enable' ? t('twoFactor.enabling') : t('twoFactor.enable')}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Email panel: send → enter the code → enable. Same
                        shape as SMS, different delivery channel. */}
                    {setupPanel === 'email' && (
                      <form
                        onSubmit={handleEnable}
                        style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', marginTop: '0.75rem' }}
                      >
                        {!codeSent ? (
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 0.875rem', lineHeight: 1.6 }}>
                            {t('twoFactor.emailEnrollDesc')}
                          </p>
                        ) : (
                          <>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 0.875rem', lineHeight: 1.6 }}>
                              {t('twoFactor.emailSentTo', { email: twoFa.emailMasked || '•••' })}
                            </p>
                            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                              {t('twoFactor.codeLabel')}
                            </label>
                            <OtpInput
                              value={twoFaCode}
                              onChange={setTwoFaCode}
                              onComplete={(v) => {
                                void runEnable(v);
                              }}
                              ariaLabel={t('twoFactor.codeLabel')}
                              autoFocus
                              style={{
                                height: '40px',
                                fontSize: '0.9375rem',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                                borderColor: 'var(--input-border)',
                                backgroundColor: 'var(--input-bg)',
                                color: 'var(--text-main)',
                              }}
                              focusStyle={{ borderColor: 'var(--accent)' }}
                            />
                            <button
                              type="button"
                              onClick={handleSendCode}
                              disabled={twoFaBusy !== null || resendIn > 0}
                              style={{
                                ...tfBtnStyle,
                                marginTop: '0.625rem',
                                opacity: twoFaBusy || resendIn > 0 ? 0.6 : 1,
                                cursor: twoFaBusy || resendIn > 0 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {resendIn > 0 ? t('twoFactor.resendIn', { sec: resendIn }) : t('twoFactor.resendCode')}
                            </button>
                          </>
                        )}
                        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.875rem' }}>
                          <button type="button" onClick={closeSetupPanel} style={tfBtnStyle}>
                            {t('common.cancel')}
                          </button>
                          {!codeSent && (
                            <button
                              type="button"
                              onClick={handleSendCode}
                              disabled={twoFaBusy !== null}
                              style={{ ...tfBtnStyle, opacity: twoFaBusy ? 0.7 : 1, cursor: twoFaBusy ? 'not-allowed' : 'pointer' }}
                            >
                              {twoFaBusy === 'send' && <Spinner size={14} />}
                              {twoFaBusy === 'send' ? t('twoFactor.sending') : t('twoFactor.sendCode')}
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={twoFaCode.length !== 6 || twoFaBusy !== null}
                            style={{
                              ...tfBtnStyle,
                              backgroundColor: 'var(--accent)',
                              color: '#ffffff',
                              border: '1px solid var(--accent)',
                              opacity: twoFaCode.length !== 6 || twoFaBusy ? 0.7 : 1,
                              cursor: twoFaCode.length !== 6 || twoFaBusy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {twoFaBusy === 'enable' && <Spinner size={14} />}
                            {twoFaBusy === 'enable' ? t('twoFactor.enabling') : t('twoFactor.enable')}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : twoFa.canDisable ? (
                  <div>
                    {!disableOpen ? (
                      <button type="button" onClick={() => setDisableOpen(true)} style={tfBtnStyle}>
                        {t('twoFactor.disable')}
                      </button>
                    ) : (
                      <form onSubmit={handleDisable} style={{ maxWidth: '420px' }}>
                        <PasswordInput
                          label={t('twoFactor.disableLabel')}
                          value={disableCredential}
                          onChange={setDisableCredential}
                          required
                          autoComplete="current-password"
                          helperText={t('twoFactor.disableHint')}
                        />
                        <div style={{ display: 'flex', gap: '0.625rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setDisableOpen(false);
                              setDisableCredential('');
                            }}
                            style={tfBtnStyle}
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={!disableCredential.trim() || twoFaBusy !== null}
                            style={{
                              ...tfBtnStyle,
                              backgroundColor: 'var(--error-bg)',
                              color: 'var(--error-text)',
                              border: '1px solid var(--error-text)',
                              opacity: !disableCredential.trim() || twoFaBusy ? 0.7 : 1,
                              cursor: !disableCredential.trim() || twoFaBusy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {twoFaBusy === 'disable' && <Spinner size={14} />}
                            {twoFaBusy === 'disable' ? t('twoFactor.disabling') : t('twoFactor.confirmDisable')}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', lineHeight: 1.6, margin: 0 }}>
                    {twoFa.enforcedByAdmin ? t('twoFactor.requiredNote') : t('twoFactor.policyNote')}
                  </p>
                )}

                {/* Super admin only: require 2FA for every admin account.
                    Two-click arm, same as every other hard toggle here. */}
                {twoFa.canManagePolicy && (
                  <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {t('twoFactor.policyTitle')}
                          </span>
                          <span
                            style={{
                              ...pillStyle,
                              backgroundColor: twoFa.policyRequired ? 'var(--success-bg)' : 'var(--secondary-btn-bg)',
                              color: twoFa.policyRequired ? 'var(--success-text)' : 'var(--text-muted)',
                            }}
                          >
                            {twoFa.policyRequired ? t('twoFactor.policyOn') : t('twoFactor.policyOff')}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem', marginBottom: 0, lineHeight: 1.6 }}>
                          {t('twoFactor.policyDesc')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePolicyToggle}
                        disabled={twoFaBusy !== null}
                        style={{
                          ...tfBtnStyle,
                          backgroundColor: policyArmed ? 'var(--accent-light)' : 'var(--secondary-btn-bg)',
                          color: policyArmed ? 'var(--accent)' : 'var(--text-main)',
                          border: policyArmed ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                          opacity: twoFaBusy ? 0.7 : 1,
                          cursor: twoFaBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {twoFaBusy === 'policy' ? (
                          <Spinner size={14} />
                        ) : policyArmed ? (
                          t('account.confirmStatus')
                        ) : twoFa.policyRequired ? (
                          t('twoFactor.policyTurnOff')
                        ) : (
                          t('twoFactor.policyTurnOn')
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </Section>
            </div>
          )}

          {/* ── Security PIN (§14.44) — same 1rem rhythm as every other
               card, so the logged-in devices card never sits flush. ── */}
          {pinState && (
            <Section
              title={t('securityPin.cardTitle')}
              description={t('securityPin.cardDesc')}
              style={{ marginBottom: '1rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: pinState.pinSet ? '0.5rem' : '1rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.1875rem 0.5rem',
                    borderRadius: '999px',
                    backgroundColor: pinState.pinSet ? 'var(--success-bg)' : 'var(--secondary-btn-bg)',
                    color: pinState.pinSet ? 'var(--success-text)' : 'var(--muted-text)',
                  }}
                >
                  {pinState.pinSet ? t('securityPin.statusSet') : t('securityPin.statusNotSet')}
                </span>
                {!pinState.pinSet && (pinState.enforcedByAdmin || pinState.policyRequired) && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)' }}>
                    {t('securityPin.requiredNotice')}
                  </span>
                )}
              </div>

              {pinState.pinSet ? (
                <>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', lineHeight: 1.6, margin: 0 }}>
                    {t('securityPin.resetNote')}
                  </p>
                  {/* While something demands the PIN there is nothing to
                      turn off — say so instead of offering a button the
                      server would refuse. */}
                  {pinState.enforcedByAdmin || pinState.policyRequired ? (
                    <p style={{ fontSize: '0.7875rem', color: 'var(--accent)', margin: '0.625rem 0 0', fontWeight: 600 }}>
                      {t('securityPin.requiredNotice')}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={handlePinDisable}
                        onBlur={() => setPinDisableArmed(false)}
                        disabled={pinBusy !== null}
                        aria-label={t('securityPin.disable')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1.125rem',
                          borderRadius: '8px',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          backgroundColor: pinDisableArmed ? 'var(--accent-light)' : 'var(--secondary-btn-bg)',
                          color: pinDisableArmed ? 'var(--accent)' : 'var(--text-main)',
                          border: pinDisableArmed ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                          opacity: pinBusy ? 0.7 : 1,
                          cursor: pinBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {pinBusy === 'disable' ? (
                          <Spinner size={14} />
                        ) : pinDisableArmed ? (
                          t('account.confirmStatus')
                        ) : (
                          t('securityPin.disable')
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); submitPinSetup(pinValue, pinConfirm); }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <label htmlFor="security-pin" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                        {t('securityPin.newPin')}
                      </label>
                      <OtpInput
                        length={4}
                        value={pinValue}
                        onChange={(v) => {
                          setPinValue(v);
                          setPinWrong(false);
                          setPinError(null);
                        }}
                        onComplete={(v) => {
                          // Auto-submit only once the other row is full
                          // too; otherwise hop straight to the confirm row.
                          if (pinConfirm.length === 4) {
                            submitPinSetup(v, pinConfirm);
                          } else {
                            document.getElementById('security-pin-confirm')?.focus();
                          }
                        }}
                        ariaLabel={t('securityPin.newPin')}
                        firstInputId="security-pin"
                        type="password"
                        autoComplete="off"
                        style={otpBoxStyle}
                        focusStyle={otpFocusStyle}
                      />
                    </div>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <label htmlFor="security-pin-confirm" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                        {t('securityPin.confirmPin')}
                      </label>
                      <OtpInput
                        length={4}
                        value={pinConfirm}
                        onChange={(v) => {
                          setPinConfirm(v);
                          setPinWrong(false);
                          setPinError(null);
                        }}
                        onComplete={(v) => {
                          if (pinValue.length === 4) submitPinSetup(pinValue, v);
                        }}
                        ariaLabel={t('securityPin.confirmPin')}
                        firstInputId="security-pin-confirm"
                        type="password"
                        autoComplete="off"
                        style={pinWrong ? otpErrorBoxStyle : otpBoxStyle}
                        focusStyle={pinWrong ? otpErrorFocusStyle : otpFocusStyle}
                      />
                    </div>
                  </div>
                  {pinError && (
                    <p role="alert" style={{ fontSize: '0.8125rem', color: 'var(--error-text)', margin: '0.625rem 0 0' }}>
                      {pinError}
                    </p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.875rem' }}>
                    <button
                      type="submit"
                      disabled={pinBusy !== null}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1.125rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--accent)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: pinBusy ? 'not-allowed' : 'pointer',
                        opacity: pinBusy ? 0.7 : 1,
                      }}
                    >
                      {pinBusy === 'setup' ? <Spinner size={14} /> : null}
                      {pinBusy === 'setup' ? t('securityPin.saving') : t('securityPin.save')}
                    </button>
                  </div>
                </form>
              )}

              {/* Super admin only: require a security PIN for every admin
                  account. Two-click arm, same as every other hard toggle. */}
              {pinState.canManagePolicy && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {t('securityPin.policyTitle')}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.1875rem 0.5rem',
                            borderRadius: '999px',
                            backgroundColor: pinState.policyRequired ? 'var(--success-bg)' : 'var(--secondary-btn-bg)',
                            color: pinState.policyRequired ? 'var(--success-text)' : 'var(--muted-text)',
                          }}
                        >
                          {pinState.policyRequired ? t('securityPin.policyOn') : t('securityPin.policyOff')}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.7875rem', color: 'var(--muted-text)', margin: '0.25rem 0 0', lineHeight: 1.6 }}>
                        {t('securityPin.policyDesc')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handlePinPolicyToggle}
                      onBlur={() => setPinPolicyArmed(false)}
                      disabled={pinBusy !== null}
                      aria-label={pinState.policyRequired ? t('securityPin.policyTurnOff') : t('securityPin.policyTurnOn')}
                      style={{
                        padding: '0.5rem 1.125rem',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        flexShrink: 0,
                        backgroundColor: pinPolicyArmed ? 'var(--accent-light)' : 'var(--secondary-btn-bg)',
                        color: pinPolicyArmed ? 'var(--accent)' : 'var(--text-main)',
                        border: pinPolicyArmed ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                        opacity: pinBusy ? 0.7 : 1,
                        cursor: pinBusy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {pinBusy === 'policy' ? (
                        <Spinner size={14} />
                      ) : pinPolicyArmed ? (
                        t('account.confirmStatus')
                      ) : pinState.policyRequired ? (
                        t('securityPin.policyTurnOff')
                      ) : (
                        t('securityPin.policyTurnOn')
                      )}
                    </button>
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* ── Logged in devices ── */}
          <Section title={t('security.devicesTitle')} description={t('security.devicesDesc')}>
            {data.sessions.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{t('security.noLoginInfo')}</p>
            ) : (
              <>
                {displaySessions.map((s, i) => {
                  const device = describeDevice(s.userAgent, t);
                  const armed = pendingSignOut === s.id;
                  const busy = revokingId === s.id;
                  const locked = revokingId !== null || revokingAll;
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 0',
                        borderTop: i === 0 ? 'none' : '1px solid var(--border-color)',
                      }}
                    >
                      <span aria-hidden="true" style={{ fontSize: '1.25rem', width: 32, textAlign: 'center', flexShrink: 0 }}>
                        {device.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {device.name}
                          </span>
                          {s.location && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              · {countryFlag(s.countryCode)} {s.location}
                            </span>
                          )}
                          {s.ipAddress && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· {s.ipAddress}</span>
                          )}
                          {s.isCurrent && <span style={pillStyle}>{t('security.thisDevice')}</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                          {t('security.signedInAt', { when: relativeTime(s.createdAt, language) })}
                        </div>
                      </div>
                      {!s.isCurrent && (
                        <RowAction
                          ariaLabel={armed ? t('account.confirmStatus') : t('security.signOut')}
                          onClick={() => handleSignOut(s)}
                          disabled={locked}
                          style={armed ? { background: 'var(--accent-light)', color: 'var(--accent)' } : undefined}
                        >
                          {busy ? (
                            <Spinner size={13} />
                          ) : armed ? (
                            t('account.confirmStatus')
                          ) : (
                            t('security.signOut')
                          )}
                        </RowAction>
                      )}
                    </div>
                  );
                })}

                {hasOthers && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '0.5rem',
                      paddingTop: '0.875rem',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleSignOutOthers}
                      disabled={revokingAll || revokingId !== null}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.875rem',
                        borderRadius: '8px',
                        backgroundColor: pendingSignOutAll ? 'var(--accent-light)' : 'var(--secondary-btn-bg)',
                        color: pendingSignOutAll ? 'var(--accent)' : 'var(--text-main)',
                        border: pendingSignOutAll ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        cursor: revokingAll || revokingId !== null ? 'not-allowed' : 'pointer',
                        opacity: revokingAll || revokingId !== null ? 0.7 : 1,
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {revokingAll ? (
                        <Spinner size={13} />
                      ) : pendingSignOutAll ? (
                        t('account.confirmStatus')
                      ) : (
                        t('security.signOutOthers')
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </Section>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }\n.row-icon-btn:hover { background: var(--accent-light); }`}</style>
      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast((prev) => (prev && prev.id === toast.id ? null : prev))}
        />
      )}
    </div>
  );
}

function Section({ title, description, children, style }: { title: string; description?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        height: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{description}</p>
      )}
      {!description && <div style={{ marginBottom: '0.75rem' }} />}
      {children}
    </div>
  );
}

// Label/value line used on the Last login card.
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.4375rem 0',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.8125rem',
      }}
    >
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: 'var(--text-main)',
          fontWeight: 500,
          textAlign: 'right',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      style={{
        minWidth: '140px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.625rem 1.5rem',
        borderRadius: '8px',
        backgroundColor: saving ? 'var(--accent-hover)' : 'var(--accent)',
        color: '#ffffff',
        fontSize: '0.875rem',
        fontWeight: 600,
        border: 'none',
        cursor: saving ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.15s',
      }}
    >
      {saving ? <Spinner /> : label}
    </button>
  );
}

function RowAction({
  children,
  onClick,
  disabled,
  style,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="row-icon-btn"
      style={{
        background: 'var(--bg-hover)',
        border: 'none',
        padding: '0.25rem 0.625rem',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: 'var(--accent)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 26,
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  required,
  error,
  helperText,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
  autoComplete?: string;
}) {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const hint = show ? t('security.hidePassword') : t('security.showPassword');
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
        {label} {required && <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            height: '40px',
            borderRadius: '8px',
            border: error ? '1px solid var(--error-text, #ef4444)' : '1px solid var(--input-border)',
            padding: '0 2.5rem 0 0.75rem',
            fontSize: '0.875rem',
            outline: 'none',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-main)',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--error-text, #ef4444)' : 'var(--input-border)';
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={hint}
          title={hint}
          style={{
            position: 'absolute',
            right: '0.625rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted-text)',
          }}
        >
          {show ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--error-text, #ef4444)', marginTop: '0.25rem' }}>{error}</p>
      ) : helperText ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>{helperText}</p>
      ) : null}
    </div>
  );
}
