'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiRequest, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';

function Spinner() {
  return (
    <svg style={{ animation: 'spin 0.7s linear infinite' }} width="16" height="16" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="32" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}

type DeadVerdict = 'expired' | 'invalid';

const DEAD_LINK_KEY = 'telnd_reset_dead:';

/**
 * Tab-local memory of a dead link. Refreshing must never flip a link that
 * already failed back into the input form: once this tab has a verdict it
 * is reused on every reload with no request at all — so a refresh loop can
 * neither re-drain the check endpoint's rate limit nor race it. A dead
 * link only gets deader (expired stays expired, spent stays spent), so the
 * verdict never needs to be re-verified; a live link is not remembered and
 * is checked again each load.
 */
function readDeadLink(token: string): DeadVerdict | null {
  try {
    const value = sessionStorage.getItem(DEAD_LINK_KEY + token);
    return value === 'expired' || value === 'invalid' ? value : null;
  } catch {
    return null; // storage unavailable — verify against the API instead
  }
}

function rememberDeadLink(token: string, verdict: DeadVerdict): void {
  try {
    sessionStorage.setItem(DEAD_LINK_KEY + token, verdict);
  } catch {
    // Storage unavailable — this load is still guarded by the live check.
  }
}

/**
 * Landing page for emailed set-password links (invite, forgot, regenerate).
 * The token arrives in the query string, is spent by the API in a single
 * transaction, and revokes every existing session — so after success the
 * user simply signs in with the new password.
 */
function ResetPasswordForm() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  // A missing token is the same failure as a bad one: one generic state.
  const [invalidLink, setInvalidLink] = useState(!token);
  // The link is verified the moment the page opens: a dead one (expired or
  // already spent) shows the notice immediately, before any typing — not
  // only after a failed submit. A verdict already reached is remembered for
  // this tab (readDeadLink), so refreshing can never flip a dead link back
  // into the form; only genuinely unknown outcomes — a network blip or the
  // rate limit — fall open to the form, and the submit path re-validates.
  const [checking, setChecking] = useState(!!token);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!token) return;

    const cached = readDeadLink(token);
    if (cached) {
      if (cached === 'expired') setExpired(true);
      else setInvalidLink(true);
      setChecking(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await apiRequest('/api/auth/reset-password/check', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 400) {
          const code = (err.data as { error?: { code?: string } } | null)?.error?.code;
          // Cache only the verdicts that actually mean "link is dead" — a
          // non-token 400 (e.g. a future password-policy rejection) must
          // never poison a live link for this tab.
          if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_INVALID') {
            rememberDeadLink(token, code === 'TOKEN_EXPIRED' ? 'expired' : 'invalid');
          }
          if (code === 'TOKEN_EXPIRED') setExpired(true);
          else setInvalidLink(true);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t('security.passwordMismatch'));
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const code = (err.data as { error?: { code?: string } } | null)?.error?.code;
        if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_INVALID') {
          rememberDeadLink(token, code === 'TOKEN_EXPIRED' ? 'expired' : 'invalid');
        }
        if (code === 'TOKEN_EXPIRED') setExpired(true);
        else setInvalidLink(true);
      } else if (err instanceof ApiError && err.status === 429) {
        setError(t('login.error.tooMany'));
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('login.error.general'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const eyeIconClosed = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  const eyeIconOpen = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
    </svg>
  );

  const inputStyle = {
    width: '100%',
    height: '44px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    padding: '0 2.5rem 0 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  } as const;

  const focusRing = {
    borderColor: '#0d9488',
    boxShadow: '0 0 0 3px rgba(13, 148, 136, 0.15), 0 2px 8px rgba(3, 69, 72, 0.08)',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 4px 16px rgba(3, 69, 72, 0.06)',
        }}
      >
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
          {t('reset.title')}
        </div>

        {done ? (
          <div>
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: '8px',
                padding: '0.875rem 1rem',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                marginBottom: '1.25rem',
              }}
            >
              {t('reset.done')}
            </div>
            <Link
              href="/login"
              style={{
                display: 'block',
                textAlign: 'center',
                background: '#0d9488',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {t('reset.signIn')}
            </Link>
          </div>
        ) : checking ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.625rem',
              padding: '2.5rem 0',
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            <Spinner />
            {t('reset.checking')}
          </div>
        ) : expired || invalidLink ? (
          <div>
            {/* Notice only — the card's "Back to sign in" link below is the
                way out, so no extra Sign in button here. */}
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: '8px',
                padding: '0.875rem 1rem',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                marginBottom: '0.25rem',
              }}
            >
              {expired ? t('reset.expired') : t('reset.invalid')}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#6b7280' }}>
              {t('reset.description')}
            </p>

            <label
              htmlFor="new-password"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}
            >
              {t('security.newPassword')}
            </label>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = focusRing.borderColor;
                  e.currentTarget.style.boxShadow = focusRing.boxShadow;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('security.hidePassword') : t('security.showPassword')}
                title={showPassword ? t('security.hidePassword') : t('security.showPassword')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#9ca3af',
                }}
              >
                {showPassword ? eyeIconOpen : eyeIconClosed}
              </button>
            </div>

            <label
              htmlFor="confirm-password"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}
            >
              {t('security.confirmPassword')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
                style={inputStyle}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = focusRing.borderColor;
                  e.currentTarget.style.boxShadow = focusRing.boxShadow;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('security.hidePassword') : t('security.showPassword')}
                title={showPassword ? t('security.hidePassword') : t('security.showPassword')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#9ca3af',
                }}
              >
                {showPassword ? eyeIconOpen : eyeIconClosed}
              </button>
            </div>

            <p style={{ margin: '0.625rem 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
              {t('security.passwordHint')}
            </p>

            {error && (
              <div
                style={{
                  marginTop: '0.875rem',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.8125rem',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                marginTop: '1.25rem',
                height: '44px',
                borderRadius: '8px',
                border: 'none',
                background: isSubmitting ? '#99f6e4' : '#0d9488',
                color: isSubmitting ? '#0f766e' : '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background 0.15s ease',
              }}
            >
              {isSubmitting && <Spinner />}
              {isSubmitting ? t('reset.setting') : t('reset.submit')}
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <Link href="/login" style={{ color: '#0d9488', fontWeight: 500, textDecoration: 'none' }}>
            {t('forgot.backToLogin')}
          </Link>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
