'use client';

// Screen lock (§14.44): the full-cover overlay raised by the side-rail
// button, 5 minutes of inactivity, or a reopened browser (its sessionStorage
// trust is gone — or the lock flag survived the close). Shows verify when a
// PIN is on file, setup when there is none (creating one — or a super admin
// demanding one), and nothing at all when the server says there is no PIN
// and none is required. A fresh sign-in never reaches this screen: auth
// marks the session trusted as it completes.

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { announcePinChange } from '@/lib/security-pin';
import { useLanguage } from '@/components/language-provider';
import { OtpInput, otpBoxStyle, otpErrorBoxStyle, otpErrorFocusStyle, otpFocusStyle } from '@/components/otp-input';
import { LockIcon } from '@/components/action-icons';

interface LockScreenProps {
  /** null = the PIN state hasn't loaded yet; the screen must not guess. */
  pinSet: boolean | null;
  /** The PIN was created here — let the layout refresh its state. */
  onPinSet: () => void;
  onUnlocked: () => void;
}

function errCode(err: unknown): string | null {
  if (err instanceof ApiError && err.data && typeof err.data === 'object') {
    const code = (err.data as { error?: { code?: string } })?.error?.code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

export default function LockScreen({ pinSet, onPinSet, onUnlocked }: LockScreenProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'verify' | 'setup' | null>(null);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockedOut, setLockedOut] = useState(false);
  // A wrong entry paints the boxes red and puts the caret back in the
  // first one instead of spelling anything out — the next digit clears
  // the colour. Locked-out and server messages keep their text.
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (pinSet !== null) {
      setMode(pinSet ? 'verify' : 'setup');
      setWrong(false);
    }
  }, [pinSet]);

  // The caret returns to the first box of the row that went red — but only
  // after this commit, never from inside the handlers: the row is cleared
  // and the inputs un-disabled in the same update, and focusing an input
  // that is still disabled is a silent no-op (which is exactly what the
  // old inline call did while the verify request was in flight).
  useEffect(() => {
    if (!wrong) return;
    document.getElementById(mode === 'setup' ? 'lock-pin-confirm' : 'lock-pin')?.focus();
  }, [wrong, mode]);

  // Both handlers take the digits as arguments: a row's onComplete runs in
  // the same batch as its onChange, so the state variable would still hold
  // the previous value there.
  async function doVerify(value: string) {
    if (value.length !== 4 || busy || lockedOut) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/users/me/pin/verify', { pin: value });
      onUnlocked();
    } catch (err) {
      const code = errCode(err);
      if (code === 'PIN_LOCKED' || (err instanceof ApiError && err.status === 429)) {
        setLockedOut(true);
        setError(t('screenLock.lockedOut'));
      } else if (code === 'PIN_NOT_SET') {
        // Reset by an admin while we were locked — switch to creating a
        // fresh one (the requirement, if any, still stands). The PIN is
        // gone server-side; tell the Security card underneath us too.
        announcePinChange();
        setMode('setup');
        setPin('');
        setWrong(false);
        setError(null);
      } else {
        // Wrong PIN: clear the row and flag it red — no sentence; the
        // effect above walks the caret into the first box once this
        // commit lands (the row is still disabled while we're in here).
        setPin('');
        setWrong(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function doSetup(value: string, confirmValue: string) {
    if (value.length !== 4 || confirmValue.length !== 4 || busy) return;
    if (value !== confirmValue) {
      // Same treatment as a wrong verify: the confirm boxes go red and
      // nothing is spelled out — the caret returns to their first box
      // through the same effect.
      setConfirm('');
      setWrong(true);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/users/me/pin', { pin: value });
      // Tell the rest of the app — the Security card under this overlay
      // must not keep reading "No PIN set" until someone hits refresh.
      announcePinChange();
      onPinSet();
      onUnlocked();
    } catch (err) {
      const code = errCode(err);
      if (code === 'PIN_EXISTS') {
        // Someone (another tab, an admin's reset that raced us) already
        // has one on file — verify it instead.
        announcePinChange();
        setMode('verify');
        setWrong(false);
        setPin('');
        setConfirm('');
        setError(t('securityPin.pinExists'));
      } else {
        setError(err instanceof ApiError ? err.message : t('common.failed'));
      }
    } finally {
      setBusy(false);
    }
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'var(--accent)',
    color: '#ffffff',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: busy || lockedOut ? 'not-allowed' : 'pointer',
    opacity: busy || lockedOut ? 0.7 : 1,
    transition: 'opacity 0.15s',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'setup' ? t('screenLock.setupTitle') : t('screenLock.verifyTitle')}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        // Solid on purpose: a lock screen must hide the page behind it,
        // not blur it into legibility.
        backgroundColor: 'var(--card-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '2rem 1.75rem',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18)',
          textAlign: 'center',
          // Wrong entry: the card jolts once, in step with the red boxes
          // (keyframes in the <style> at the bottom of this overlay).
          animation: wrong ? 'shake 0.4s ease' : undefined,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            margin: '0 auto 1rem',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LockIcon size={24} />
        </div>

        {mode === null ? (
          <div role="status" style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
            <Spinner />
          </div>
        ) : mode === 'verify' ? (
          <>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.375rem' }}>
              {t('screenLock.verifyTitle')}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
              {t('screenLock.verifyDesc')}
            </p>
            <form onSubmit={(e) => { e.preventDefault(); void doVerify(pin); }}>
              <OtpInput
                length={4}
                value={pin}
                onChange={(v) => {
                  setPin(v);
                  setWrong(false);
                  setError(null);
                }}
                onComplete={(v) => {
                  // Fourth digit in — unlock, same as the six-box rows.
                  void doVerify(v);
                }}
                ariaLabel={t('screenLock.pinLabel')}
                firstInputId="lock-pin"
                type="password"
                autoComplete="off"
                autoFocus
                disabled={busy || lockedOut}
                containerStyle={{ justifyContent: 'center' }}
                style={wrong ? otpErrorBoxStyle : otpBoxStyle}
                focusStyle={wrong ? otpErrorFocusStyle : otpFocusStyle}
              />
              {error && (
                <p role="alert" style={{ fontSize: '0.8125rem', color: 'var(--error-text)', margin: '0.75rem 0 0' }}>
                  {error}
                </p>
              )}
              <button type="submit" disabled={pin.length !== 4 || busy || lockedOut} style={{ ...buttonStyle, marginTop: '1.25rem' }}>
                {busy ? <Spinner /> : null}
                {busy ? t('screenLock.unlocking') : t('screenLock.unlock')}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.375rem' }}>
              {t('screenLock.setupTitle')}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
              {t('screenLock.setupDesc')}
            </p>
            {/* Centered like the rest of the card: the title and copy sit
                in the middle, so the labels and boxes do too. */}
            <form onSubmit={(e) => { e.preventDefault(); void doSetup(pin, confirm); }}>
              <label htmlFor="lock-pin" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
                {t('screenLock.pinLabel')}
              </label>
              <OtpInput
                length={4}
                value={pin}
                onChange={(v) => {
                  setPin(v);
                  setWrong(false);
                  setError(null);
                }}
                onComplete={(v) => {
                  if (confirm.length === 4) {
                    void doSetup(v, confirm);
                  } else {
                    // First PIN in — hop straight to the confirm row.
                    document.getElementById('lock-pin-confirm')?.focus();
                  }
                }}
                ariaLabel={t('screenLock.pinLabel')}
                firstInputId="lock-pin"
                type="password"
                autoComplete="off"
                autoFocus
                disabled={busy}
                containerStyle={{ justifyContent: 'center' }}
                style={otpBoxStyle}
                focusStyle={otpFocusStyle}
              />
              <label htmlFor="lock-pin-confirm" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', margin: '0.875rem 0 0.375rem' }}>
                {t('screenLock.confirmLabel')}
              </label>
              <OtpInput
                length={4}
                value={confirm}
                onChange={(v) => {
                  setConfirm(v);
                  setWrong(false);
                  setError(null);
                }}
                onComplete={(v) => {
                  if (pin.length === 4) void doSetup(pin, v);
                }}
                ariaLabel={t('screenLock.confirmLabel')}
                firstInputId="lock-pin-confirm"
                type="password"
                autoComplete="off"
                disabled={busy}
                containerStyle={{ justifyContent: 'center' }}
                style={wrong ? otpErrorBoxStyle : otpBoxStyle}
                focusStyle={wrong ? otpErrorFocusStyle : otpFocusStyle}
              />
              {error && (
                <p role="alert" style={{ fontSize: '0.8125rem', color: 'var(--error-text)', margin: '0.75rem 0 0' }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={pin.length !== 4 || confirm.length !== 4 || busy}
                style={{ ...buttonStyle, marginTop: '1.25rem' }}
              >
                {busy ? <Spinner /> : null}
                {busy ? t('screenLock.creating') : t('screenLock.create')}
              </button>
            </form>
          </>
        )}
      </div>
      {/* Local keyframes: `spin` for the buttons' spinner (neither this
          overlay nor its parents guarantee it), `shake` for the card's
          wrong-entry jolt. */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }\n@keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }`}</style>
    </div>
  );
}

function Spinner() {
  return (
    <svg style={{ animation: 'spin 0.7s linear infinite' }} width={16} height={16} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.8" />
    </svg>
  );
}
