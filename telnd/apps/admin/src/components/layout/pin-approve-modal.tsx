'use client';

// PIN approval modal (§14.44): opened by api.ts when a sensitive action
// answers PIN_REQUIRED / PIN_INVALID. Pre-verifies the entered digits
// against the lock-screen endpoint so a wrong PIN keeps the modal open
// with the error, and only the verified value is handed back for the
// retried request's X-Admin-Pin header. Escape and Cancel close it (the
// original API error then surfaces as its toast); the backdrop does not.

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import { type PinPromptReason } from '@/lib/security-pin';
import { OtpInput, otpBoxStyle, otpErrorBoxStyle, otpErrorFocusStyle, otpFocusStyle } from '@/components/otp-input';
import { LockIcon } from '@/components/action-icons';

interface PinApproveModalProps {
  reason: PinPromptReason;
  /** Digits verified — the caller resolves the API retry with them. */
  onApproved: (pin: string) => void;
  /** Closed without approving — the API error surfaces to the caller. */
  onCancel: () => void;
}

function errCode(err: unknown): string | null {
  if (err instanceof ApiError && err.data && typeof err.data === 'object') {
    const code = (err.data as { error?: { code?: string } })?.error?.code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

export default function PinApproveModal({ reason, onApproved, onCancel }: PinApproveModalProps) {
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  // A wrong PIN paints the boxes red and puts the caret back in the first
  // one instead of spelling it out — also the state this modal opens in
  // when it was raised by a PIN_INVALID challenge. Locked-out and
  // unexpected server messages keep their text.
  const [wrong, setWrong] = useState(reason === 'invalid');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockedOut, setLockedOut] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Caret back in the first box once the cleared row has committed — an
  // inline focus() would hit an input that is still disabled, since
  // `busy` only comes down in the verify request's finally.
  useEffect(() => {
    if (wrong) document.getElementById('approve-pin')?.focus();
  }, [wrong]);

  // The digits arrive as an argument: the row's onComplete runs in the same
  // batch as its onChange, when the state variable still holds the old value.
  async function doApprove(value: string) {
    if (value.length !== 4 || busy || lockedOut) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/users/me/pin/verify', { pin: value });
      onApproved(value);
    } catch (err) {
      const code = errCode(err);
      if (code === 'PIN_LOCKED' || (err instanceof ApiError && err.status === 429)) {
        setLockedOut(true);
        setError(t('pinApprove.lockedOut'));
      } else if (code === 'PIN_NOT_SET') {
        // The PIN was reset under us — abort; the original challenge
        // stands and the next attempt asks again from scratch.
        onCancel();
      } else if (err instanceof ApiError && (err.status === 403 || err.status === 429)) {
        // Wrong PIN: clear the row and flag it red, no sentence — the
        // effect above restores the caret once this commit lands.
        setPin('');
        setWrong(true);
      } else {
        setError(err instanceof ApiError ? err.message : t('common.failed'));
      }
    } finally {
      setBusy(false);
    }
  }

  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'var(--accent)',
    color: '#ffffff',
    border: 'none',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: busy || lockedOut ? 'not-allowed' : 'pointer',
    opacity: busy || lockedOut ? 0.7 : 1,
  };

  const cancelBtn: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'var(--secondary-btn-bg)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-color)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      // Backdrop deliberately does not close: an approval dialog is only
      // left through its own controls (Escape / Cancel / approved).
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('pinApprove.title')}
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '360px',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.28)',
          // Wrong PIN: the card jolts once with the red boxes — keyframes
          // in the <style> at the bottom of this dialog.
          animation: wrong ? 'shake 0.4s ease' : undefined,
        }}
      >
        {/* Pinned header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <span aria-hidden="true" style={{ color: 'var(--accent)', display: 'inline-flex' }}>
              <LockIcon size={16} />
            </span>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
              {t('pinApprove.title')}
            </h4>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('common.cancel')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              borderRadius: '6px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void doApprove(pin); }}>
          <div style={{ padding: '1.25rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', margin: '0 0 0.875rem', lineHeight: 1.6 }}>
              {t('pinApprove.desc')}
            </p>
            <OtpInput
              length={4}
              value={pin}
              onChange={(v) => {
                setPin(v);
                setWrong(false);
                setError(null);
              }}
              onComplete={(v) => {
                // Fourth digit in — pre-verify without waiting for a click.
                void doApprove(v);
              }}
              ariaLabel={t('screenLock.pinLabel')}
              firstInputId="approve-pin"
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
          </div>

          {/* Pinned footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" onClick={onCancel} style={cancelBtn}>
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={pin.length !== 4 || busy || lockedOut} style={primaryBtn}>
              {busy ? (
                <svg style={{ animation: 'spin 0.7s linear infinite' }} width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.8" />
                </svg>
              ) : null}
              {busy ? t('pinApprove.checking') : t('pinApprove.approve')}
            </button>
          </div>
        </form>
      </div>
      {/* Local keyframes: `spin` for the approve button's spinner, `shake`
          for the dialog's wrong-entry jolt. */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }\n@keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }`}</style>
    </div>
  );
}
