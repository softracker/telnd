'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/components/language-provider';
import { OtpInput, type OtpInputHandle } from '@/components/otp-input';

function Spinner() {
  return (
    <svg style={{ animation: 'spin 0.7s linear infinite' }} width="16" height="16" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="32" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}

interface ChallengeInfo {
  requiresEnrollment: boolean;
  method: 'totp' | 'sms' | 'email' | null;
  phoneMasked: string | null;
  smsAvailable: boolean;
  smsConfigured: boolean;
  emailMasked: string | null;
  emailAvailable: boolean;
  emailConfigured: boolean;
  /** An enrolled challenge offers the recovery-code path only when some remain. */
  recoveryCodesAvailable: boolean;
}

interface PendingSetup {
  otpauthUri: string;
  secret: string;
}

type Mode = 'challenge' | 'choose' | 'setup-totp' | 'setup-sms' | 'setup-email';

/** What `/2fa/challenge/verify` replies: the session user, sometimes plus a new code set. */
type VerifyResult = {
  user: Parameters<ReturnType<typeof useAuth>['completeLogin']>[0];
  recoveryCodes?: string[];
};

/**
 * The screen sign-in stops at. Reached from /login when the password was
 * right but a second factor is on (or required and not yet set up) — the
 * pending challenge lives in its own HttpOnly cookie, so nothing here ever
 * sees a session: every call runs against that cookie, and the verify
 * response is what finally completes the sign-in (auth-context's
 * completeLogin stores the user and routes into the app).
 */
export default function TwoFactorPage() {
  const { completeLogin } = useAuth();
  const { t } = useLanguage();

  const [info, setInfo] = useState<ChallengeInfo | null>(null);
  const [mode, setMode] = useState<Mode>('challenge');
  const [setup, setSetup] = useState<PendingSetup | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState<'verify' | 'send' | 'setup' | null>(null);
  const [expired, setExpired] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [copied, setCopied] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryValue, setRecoveryValue] = useState('');
  // A verify response can carry a fresh recovery-code set (just enrolled,
  // or the last code was just spent). The save screen must be acknowledged
  // before the sign-in continues, so the payload parks here first.
  const [pendingComplete, setPendingComplete] = useState<{
    user: Parameters<typeof completeLogin>[0];
    codes: string[];
  } | null>(null);
  const [codesCopied, setCodesCopied] = useState(false);
  const [codesSavedOk, setCodesSavedOk] = useState(false);
  const codeRef = useRef<OtpInputHandle>(null);

  const loadChallenge = useCallback(async () => {
    try {
      const res = await api.post<{ success: boolean; data: ChallengeInfo }>('/api/auth/2fa/challenge', {});
      setInfo(res.data);
      setMode(res.data.requiresEnrollment ? 'choose' : 'challenge');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setExpired(true);
      else if (err instanceof ApiError) setError(err.message);
      else setError(t('login.error.general'));
    }
  }, [t]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  // Resend countdown for SMS codes — one tick per second while active.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // #31: the pending TOTP secret must not outlive the screen showing it —
  // five minutes after it appears (or if nobody touches it), the panel
  // folds back to the choice row and the secret leaves memory. Restarting
  // setup then issues a fresh draft on the server anyway.
  useEffect(() => {
    if (!setup) return;
    const timer = setTimeout(() => {
      setSetup(null);
      setCode('');
      setCopied(false);
      setError('');
      setMode(info?.requiresEnrollment ? 'choose' : 'challenge');
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [setup, info?.requiresEnrollment]);

  // #31: a freshly rotated recovery-code set must not sit in state until
  // someone remembers to acknowledge it — after five minutes the sign-in
  // simply finishes. The codes were already rotated server-side; if they
  // were never saved, rotate a new set from the Security page.
  useEffect(() => {
    if (!pendingComplete) return;
    const timer = setTimeout(() => {
      const user = pendingComplete.user;
      setPendingComplete(null);
      setCodesSavedOk(false);
      completeLogin(user);
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [pendingComplete, completeLogin]);

  function failWith(err: unknown): void {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        setExpired(true);
        return;
      }
      const body = err.data as { error?: { message?: string } } | null;
      setError(body?.error?.message || err.message);
      return;
    }
    setError(t('login.error.general'));
  }

  // Which OTP channel the current screen delivers through: an enrollment
  // screen names its own choice; an active challenge follows the method
  // stored on the account (the server enforces the same thing).
  function otpChannel(): 'sms' | 'email' {
    if (mode === 'setup-email') return 'email';
    if (mode === 'setup-sms') return 'sms';
    return info?.method === 'email' ? 'email' : 'sms';
  }

  async function sendCode() {
    setError('');
    setBusy(true);
    setBusyKind('send');
    try {
      await api.post('/api/auth/2fa/challenge/send', { method: otpChannel() });
      setCodeSent(true);
      setResendIn(45);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      failWith(err);
    } finally {
      setBusy(false);
      setBusyKind(null);
    }
  }

  async function startTotpSetup() {
    setError('');
    setBusy(true);
    setBusyKind('setup');
    try {
      const res = await api.post<{ success: boolean; data: PendingSetup }>('/api/auth/2fa/challenge/setup', {});
      setSetup(res.data);
      setMode('setup-totp');
      setCopied(false);
    } catch (err) {
      failWith(err);
    } finally {
      setBusy(false);
      setBusyKind(null);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    await runVerify(code);
  }

  // Shared by the form's submit and the OTP row's onComplete, which hands
  // the sixth digit over directly — reading the `code` state there would
  // race the re-render.
  async function runVerify(value: string) {
    if (busy || value.length !== 6) return;
    setError('');
    setBusy(true);
    setBusyKind('verify');
    try {
      const body: Record<string, unknown> = { code: value };
      // Enrollment screens say which factor they just set up; an active
      // challenge always uses the method already stored on the account.
      if (info?.requiresEnrollment) {
        body.method = mode === 'setup-totp' ? 'totp' : mode === 'setup-email' ? 'email' : 'sms';
      }
      const res = await api.post<{ success: boolean; data: VerifyResult }>('/api/auth/2fa/challenge/verify', body);
      finishVerify(res.data);
    } catch (err) {
      failWith(err);
      setCode('');
      setTimeout(() => codeRef.current?.focus(), 50);
    } finally {
      setBusy(false);
      setBusyKind(null);
    }
  }

  // The sign-in is only half done when the response carries new recovery
  // codes: park it until the save screen is acknowledged, otherwise go
  // straight into the app.
  function finishVerify(data: VerifyResult): void {
    if (data.recoveryCodes && data.recoveryCodes.length > 0) {
      setPendingComplete({ user: data.user, codes: data.recoveryCodes });
    } else {
      completeLogin(data.user);
    }
  }

  // The lost-factor path: one single-use recovery code instead of the
  // enrolled method. The server answers unknown and spent codes alike, so
  // a failure just clears the field for another try.
  async function runRecovery(e: FormEvent) {
    e.preventDefault();
    const digits = recoveryValue.replace(/\D/g, '');
    if (busy || digits.length !== 10) return;
    setError('');
    setBusy(true);
    setBusyKind('verify');
    try {
      const res = await api.post<{ success: boolean; data: VerifyResult }>('/api/auth/2fa/challenge/verify', {
        recoveryCode: digits,
      });
      finishVerify(res.data);
    } catch (err) {
      failWith(err);
      setRecoveryValue('');
    } finally {
      setBusy(false);
      setBusyKind(null);
    }
  }

  const primaryButton = {
    width: '100%',
    height: '44px',
    borderRadius: '8px',
    border: 'none',
    background: '#0d9488',
    color: '#ffffff',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.7 : 1,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: '0.5rem',
  };

  const secondaryButton = {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: '0.375rem',
    height: '36px',
    padding: '0 0.875rem',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#374151',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.7 : 1,
  };

  function codeInput() {
    return (
      <OtpInput
        ref={codeRef}
        firstInputId="2fa-code"
        value={code}
        onChange={setCode}
        onComplete={(v) => {
          void runVerify(v);
        }}
        ariaLabel={t('twoFactor.codeLabel')}
        autoFocus
        containerStyle={{ justifyContent: 'center' }}
        focusStyle={{
          borderColor: '#0d9488',
          boxShadow: '0 0 0 3px rgba(13, 148, 136, 0.15), 0 2px 8px rgba(3, 69, 72, 0.08)',
        }}
      />
    );
  }

  const errorBox = error ? (
    <div
      role="alert"
      style={{
        marginTop: '0.875rem',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#991b1b',
        borderRadius: '8px',
        padding: '0.875rem 1rem',
        fontSize: '0.875rem',
        lineHeight: 1.6,
      }}
    >
      {error}
    </div>
  ) : null;

  const backToLogin = (
    <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
      <Link href="/login" style={{ fontSize: '0.8125rem', color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>
        {t('twoFactor.backToLogin')}
      </Link>
    </div>
  );

  // ── Body per state ──────────────────────────────────────────────────────

  let body: React.ReactNode;

  if (pendingComplete) {
    // The new codes exist in plaintext only in the response that issued
    // them — this screen is the one chance to keep them. No other exit:
    // the session below is already created server-side, so leaving means
    // acknowledging the save first.
    const codes = pendingComplete.codes;
    const copyCodes = () => {
      navigator.clipboard?.writeText(codes.join('\n')).then(() => {
        setCodesCopied(true);
        setTimeout(() => setCodesCopied(false), 2000);
      });
    };
    const downloadCodes = () => {
      const blob = new Blob([`${codes.join('\n')}\n`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'telnd-recovery-codes.txt';
      link.click();
      URL.revokeObjectURL(url);
    };
    body = (
      <div>
        <p style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
          {t('twoFactor.saveCodesTitle')}
        </p>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#6b7280' }}>
          {t('twoFactor.saveCodesDesc')}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '0.5rem',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            padding: '0.875rem 1rem',
            marginBottom: '1rem',
          }}
        >
          {codes.map((single, idx) => (
            <code
              key={`${idx}-${single}`}
              style={{
                textAlign: 'center',
                fontSize: '0.9375rem',
                letterSpacing: '0.12em',
                color: '#111827',
                userSelect: 'all',
              }}
            >
              {single}
            </code>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" onClick={copyCodes} style={{ ...secondaryButton, flex: 1 }}>
            {codesCopied ? t('twoFactor.codesCopied') : t('twoFactor.copyCodes')}
          </button>
          <button type="button" onClick={downloadCodes} style={{ ...secondaryButton, flex: 1 }}>
            {t('twoFactor.downloadCodes')}
          </button>
        </div>

        <label
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
            fontSize: '0.8125rem',
            color: '#374151',
            marginBottom: '1rem',
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
            const user = pendingComplete.user;
            setPendingComplete(null);
            setCodesSavedOk(false);
            completeLogin(user);
          }}
          style={{
            ...primaryButton,
            cursor: codesSavedOk ? 'pointer' : 'not-allowed',
            opacity: codesSavedOk ? 1 : 0.6,
          }}
        >
          {t('twoFactor.codesDone')}
        </button>
      </div>
    );
  } else if (expired) {
    body = (
      <div>
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '8px',
            padding: '0.875rem 1rem',
            fontSize: '0.875rem',
            lineHeight: 1.6,
          }}
        >
          {t('twoFactor.expired')}
        </div>
        {backToLogin}
      </div>
    );
  } else if (!info) {
    body = (
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
        {t('twoFactor.checking')}
      </div>
    );
  } else if (mode === 'choose') {
    const smsNote = !info.smsConfigured
      ? t('twoFactor.smsNotConfigured')
      : !info.smsAvailable
        ? t('twoFactor.phoneHint')
        : null;
    const emailNote = !info.emailConfigured
      ? t('twoFactor.emailNotConfigured')
      : !info.emailAvailable
        ? t('twoFactor.emailHint')
        : null;
    body = (
      <div>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#6b7280' }}>
          {t('twoFactor.chooseDesc')}
        </p>

        <button
          type="button"
          onClick={startTotpSetup}
          disabled={busy}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '0.75rem',
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>
            {busyKind === 'setup' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Spinner />
                {t('twoFactor.optionApp')}
              </span>
            ) : (
              t('twoFactor.optionApp')
            )}
          </span>
          <span style={{ display: 'block', fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {t('twoFactor.optionAppDesc')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('setup-sms');
            setCopied(false);
            setError('');
          }}
          disabled={Boolean(smsNote)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '0.75rem',
            cursor: smsNote ? 'not-allowed' : 'pointer',
            opacity: smsNote ? 0.55 : 1,
          }}
        >
          <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>
            {t('twoFactor.optionSms')}
          </span>
          <span style={{ display: 'block', fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {t('twoFactor.optionSmsDesc')}
          </span>
          {smsNote && (
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#b45309', marginTop: '0.5rem' }}>
              {smsNote}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('setup-email');
            setCopied(false);
            setError('');
          }}
          disabled={Boolean(emailNote)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '10px',
            padding: '1rem',
            cursor: emailNote ? 'not-allowed' : 'pointer',
            opacity: emailNote ? 0.55 : 1,
          }}
        >
          <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>
            {t('twoFactor.optionEmail')}
          </span>
          <span style={{ display: 'block', fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {t('twoFactor.optionEmailDesc')}
          </span>
          {emailNote && (
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#b45309', marginTop: '0.5rem' }}>
              {emailNote}
            </span>
          )}
        </button>

        {errorBox}
        {backToLogin}
      </div>
    );
  } else if (mode === 'setup-totp' && setup) {
    body = (
      <form onSubmit={verify}>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#6b7280' }}>
          {t('twoFactor.qrHelp')}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '0.75rem',
              lineHeight: 0,
            }}
          >
            <QRCodeSVG value={setup.otpauthUri} size={176} marginSize={0} />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.375rem' }}>
            {t('twoFactor.manualKey')}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <code
              style={{
                flex: 1,
                minWidth: 0,
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0.5rem 0.625rem',
                fontSize: '0.8125rem',
                wordBreak: 'break-all',
                userSelect: 'all',
              }}
            >
              {setup.secret}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(setup.secret).then(
                  () => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  },
                  () => {},
                );
              }}
              style={secondaryButton}
            >
              {copied ? t('twoFactor.copied') : t('twoFactor.copy')}
            </button>
          </div>
        </div>

        <label
          htmlFor="2fa-code"
          style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}
        >
          {t('twoFactor.codeLabel')}
        </label>
        {codeInput()}

        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => {
              setMode('choose');
              // Leaving the setup screen takes the secret with it — it
              // must not sit in state after the panel that showed it (#31).
              setSetup(null);
              setCopied(false);
              setCode('');
              setError('');
            }}
            style={{ ...secondaryButton, height: '44px' }}
          >
            {t('twoFactor.back')}
          </button>
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            style={{ ...primaryButton, height: '44px' }}
          >
            {busyKind === 'verify' ? <Spinner /> : null}
            {busyKind === 'verify' ? t('twoFactor.verifying') : t('twoFactor.verify')}
          </button>
        </div>

        {errorBox}
        {backToLogin}
      </form>
    );
  } else if (mode === 'setup-sms') {
    body = (
      <form onSubmit={verify}>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#6b7280' }}>
          {codeSent
            ? t('twoFactor.smsSentTo', { phone: info.phoneMasked || '•••' })
            : t('twoFactor.smsDesc')}
        </p>

        {!codeSent ? (
          <button type="button" onClick={sendCode} disabled={busy} style={{ ...primaryButton }}>
            {busyKind === 'send' ? <Spinner /> : null}
            {busyKind === 'send' ? t('twoFactor.sending') : t('twoFactor.sendCode')}
          </button>
        ) : (
          <>
            <label
              htmlFor="2fa-code"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}
            >
              {t('twoFactor.codeLabel')}
            </label>
            {codeInput()}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              style={{ ...primaryButton, marginTop: '1rem' }}
            >
              {busyKind === 'verify' ? <Spinner /> : null}
              {busyKind === 'verify' ? t('twoFactor.verifying') : t('twoFactor.verify')}
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || resendIn > 0}
              style={{
                ...secondaryButton,
                width: '100%',
                height: '36px',
                marginTop: '0.625rem',
              }}
            >
              {resendIn > 0 ? t('twoFactor.resendIn', { sec: resendIn }) : t('twoFactor.resendCode')}
            </button>
          </>
        )}

        <div style={{ marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => {
              setMode('choose');
              setCode('');
              setCodeSent(false);
              setResendIn(0);
              setError('');
            }}
            style={secondaryButton}
          >
            {t('twoFactor.back')}
          </button>
        </div>

        {errorBox}
        {backToLogin}
      </form>
    );
  } else if (mode === 'setup-email') {
    body = (
      <form onSubmit={verify}>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#6b7280' }}>
          {codeSent
            ? t('twoFactor.emailSentTo', { email: info.emailMasked || '•••' })
            : t('twoFactor.emailDesc')}
        </p>

        {!codeSent ? (
          <button type="button" onClick={sendCode} disabled={busy} style={{ ...primaryButton }}>
            {busyKind === 'send' ? <Spinner /> : null}
            {busyKind === 'send' ? t('twoFactor.sending') : t('twoFactor.sendCode')}
          </button>
        ) : (
          <>
            <label
              htmlFor="2fa-code"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}
            >
              {t('twoFactor.codeLabel')}
            </label>
            {codeInput()}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              style={{ ...primaryButton, marginTop: '1rem' }}
            >
              {busyKind === 'verify' ? <Spinner /> : null}
              {busyKind === 'verify' ? t('twoFactor.verifying') : t('twoFactor.verify')}
            </button>
            <button
              type="button"
              onClick={sendCode}
              disabled={busy || resendIn > 0}
              style={{
                ...secondaryButton,
                width: '100%',
                height: '36px',
                marginTop: '0.625rem',
              }}
            >
              {resendIn > 0 ? t('twoFactor.resendIn', { sec: resendIn }) : t('twoFactor.resendCode')}
            </button>
          </>
        )}

        <div style={{ marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => {
              setMode('choose');
              setCode('');
              setCodeSent(false);
              setResendIn(0);
              setError('');
            }}
            style={secondaryButton}
          >
            {t('twoFactor.back')}
          </button>
        </div>

        {errorBox}
        {backToLogin}
      </form>
    );
  } else if (useRecovery && info.recoveryCodesAvailable) {
    // The lost-factor form, reached from the challenge by someone whose
    // phone, inbox or authenticator is gone. Ten digits in one field —
    // not the six-box OTP row, whose shape would reject a recovery code.
    body = (
      <form onSubmit={runRecovery}>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#6b7280' }}>
          {t('twoFactor.recoveryHelp')}
        </p>

        <label
          htmlFor="recovery-code"
          style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}
        >
          {t('twoFactor.recoveryLabel')}
        </label>
        <input
          id="recovery-code"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          value={recoveryValue}
          onChange={(e) => setRecoveryValue(e.target.value)}
          disabled={busy}
          placeholder="1234567890"
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            padding: '0 0.875rem',
            fontSize: '1rem',
            letterSpacing: '0.15em',
            color: '#111827',
            background: '#ffffff',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={busy || recoveryValue.replace(/\D/g, '').length !== 10}
          style={{ ...primaryButton, marginTop: '1rem' }}
        >
          {busyKind === 'verify' ? <Spinner /> : null}
          {busyKind === 'verify' ? t('twoFactor.verifying') : t('twoFactor.verify')}
        </button>

        <div style={{ marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => {
              setUseRecovery(false);
              setRecoveryValue('');
              setError('');
            }}
            disabled={busy}
            style={secondaryButton}
          >
            {t('twoFactor.back')}
          </button>
        </div>

        {errorBox}
        {backToLogin}
      </form>
    );
  } else {
    // Active challenge (already enrolled) — the stored method decides the
    // form: TOTP asks for the app code, SMS and email send an OTP first.
    const channel: 'sms' | 'email' | null =
      info.method === 'sms' || info.method === 'email' ? info.method : null;
    const description = channel
      ? codeSent
        ? channel === 'email'
          ? t('twoFactor.emailSentTo', { email: info.emailMasked || '•••' })
          : t('twoFactor.smsSentTo', { phone: info.phoneMasked || '•••' })
        : channel === 'email'
          ? t('twoFactor.emailDesc')
          : t('twoFactor.smsDesc')
      : t('twoFactor.verifyTotpDesc');
    body = (
      <form onSubmit={verify}>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#6b7280' }}>
          {description}
        </p>

        {channel && !codeSent && (
          <button type="button" onClick={sendCode} disabled={busy} style={{ ...primaryButton, marginBottom: '1rem' }}>
            {busyKind === 'send' ? <Spinner /> : null}
            {busyKind === 'send' ? t('twoFactor.sending') : t('twoFactor.sendCode')}
          </button>
        )}

        {(!channel || codeSent) && (
          <>
            <label
              htmlFor="2fa-code"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}
            >
              {t('twoFactor.codeLabel')}
            </label>
            {codeInput()}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              style={{ ...primaryButton, marginTop: '1rem' }}
            >
              {busyKind === 'verify' ? <Spinner /> : null}
              {busyKind === 'verify' ? t('twoFactor.verifying') : t('twoFactor.verify')}
            </button>
            {channel && resendIn > 0 && (
              <button
                type="button"
                onClick={sendCode}
                disabled={busy}
                style={{ ...secondaryButton, width: '100%', height: '36px', marginTop: '0.625rem' }}
              >
                {t('twoFactor.resendIn', { sec: resendIn })}
              </button>
            )}
          </>
        )}

        {info.recoveryCodesAvailable && (
          <button
            type="button"
            onClick={() => {
              setUseRecovery(true);
              setError('');
            }}
            disabled={busy}
            style={{
              display: 'block',
              width: '100%',
              marginTop: '1rem',
              padding: 0,
              background: 'none',
              border: 'none',
              color: '#0d9488',
              fontSize: '0.8125rem',
              fontWeight: 600,
              textAlign: 'center',
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            {t('twoFactor.useRecovery')}
          </button>
        )}

        {errorBox}
        {backToLogin}
      </form>
    );
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
            {info?.requiresEnrollment ? t('twoFactor.chooseTitle') : t('twoFactor.title')}
          </span>
        </div>

        {body}
      </div>

      {/* Spinner keyframes: this screen renders its own <Spinner>, and no
          other stylesheet on /2fa defines `spin` — without it the icon
          sits frozen instead of rotating. */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
