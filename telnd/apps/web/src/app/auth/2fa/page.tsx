'use client';

// Two-factor challenge — what happens when /api/auth/login answers
// requires2FA (an enrolled second factor, or a forced-setup account).
// Same design language as the OTP step: six boxes, resend countdown,
// recovery-code escape hatch. Forced enrollment has no portal self-setup
// flow (the app never designed one) — that state says so plainly instead
// of dead-ending on a spinner.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { authErrorMessage, authErrorCode, landingPath, useCountdown } from '@/lib/auth';
import {
  AuthError,
  AuthFrame,
  AuthInput,
  AuthTopBar,
  OtpBoxes,
  PrimaryButton,
} from '@/components/auth/AuthUI';

type Challenge = {
  requiresEnrollment: boolean;
  method: 'totp' | 'sms' | 'email' | null;
  phoneMasked: string | null;
  emailMasked: string | null;
  recoveryCodesAvailable: boolean;
};

type Mode = 'loading' | 'expired' | 'enrollment' | 'verify' | 'saved';

export default function AuthTwoFactorPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('loading');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [boxes, setBoxes] = useState<string[]>(['', '', '', '', '', '']);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [resendSeconds, setResendSeconds] = useCountdown(0);
  const autoSent = useRef(false);

  // Read the challenge: expired pending cookie (slow typist, stale tab)
  // lands on the expired state; a forced-setup account on enrollment.
  useEffect(() => {
    let alive = true;
    api
      .post<{ data?: Challenge }>('/api/auth/2fa/challenge', {})
      .then((res) => {
        if (!alive) return;
        const data = res?.data;
        if (!data) {
          setMode('expired');
          return;
        }
        setChallenge(data);
        setMode(data.requiresEnrollment ? 'enrollment' : 'verify');
      })
      .catch(() => {
        if (alive) setMode('expired');
      });
    return () => {
      alive = false;
    };
  }, []);

  const needsCodeSend =
    mode === 'verify' && challenge?.method !== null && challenge?.method !== 'totp';

  const sendCode = useCallback(async () => {
    setSending(true);
    setError('');
    try {
      await api.post('/api/auth/2fa/challenge/send', {});
      setResendSeconds(60);
    } catch (err) {
      setError(authErrorMessage(err, 'The code could not be sent. Please try again.'));
    } finally {
      setSending(false);
    }
  }, [setResendSeconds]);

  // SMS/email challenges deliver on arrival — but once only (dev's
  // StrictMode double-mount must not double-send).
  useEffect(() => {
    if (!needsCodeSend || autoSent.current) return;
    autoSent.current = true;
    void sendCode();
  }, [needsCodeSend, sendCode]);

  async function verify(value?: string) {
    if (submitting || !challenge) return;
    const body: Record<string, unknown> = useRecovery
      ? { recoveryCode: recoveryCode.trim() }
      : { code: value ?? boxes.join(''), method: challenge.method ?? undefined };
    if (!useRecovery && String(body.code).length !== 6) return;
    if (useRecovery && !recoveryCode.trim()) return;

    setError('');
    setSubmitting(true);
    try {
      const res = (await api.post('/api/auth/2fa/challenge/verify', body)) as {
        data?: { recoveryCodes?: string[] };
      };
      const codes = res?.data?.recoveryCodes;
      if (Array.isArray(codes) && codes.length > 0) {
        setRecoveryCodes(codes);
        setMode('saved');
        setSubmitting(false);
        return;
      }
      router.replace(landingPath());
    } catch (err) {
      const code = authErrorCode(err);
      if (code === 'CHALLENGE_EXPIRED' || code === 'TOO_MANY_ATTEMPTS') {
        setError(authErrorMessage(err, 'Your sign-in attempt expired. Please sign in again.'));
        setMode('expired');
        return;
      }
      setError(authErrorMessage(err, 'That code is incorrect. Please try again.'));
      if (!useRecovery) setBoxes(['', '', '', '', '', '']);
      setSubmitting(false);
    }
  }

  function goSignIn() {
    router.replace('/auth');
  }

  return (
    <AuthFrame>
      <div className="pt-4">
        <AuthTopBar backHref="/auth" />
      </div>

      <div className="flex flex-1 flex-col px-6">
        {mode === 'loading' && (
          <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center py-10">
            <p className="text-center text-[14px] text-[#64748B] dark:text-white/50">
              Checking your sign-in…
            </p>
          </div>
        )}

        {mode === 'expired' && (
          <div className="flex min-h-[260px] flex-1 flex-col justify-center py-10 text-center">
            <h1 className="text-[24px] font-bold text-[#1F2937] dark:text-[#F1F5F9]">
              Sign-in expired
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              {error || 'Your two-factor challenge has expired. Please sign in again.'}
            </p>
            <div className="mt-8">
              <PrimaryButton type="button" onClick={goSignIn}>
                Back to sign in
              </PrimaryButton>
            </div>
          </div>
        )}

        {mode === 'enrollment' && (
          <div className="flex min-h-[260px] flex-1 flex-col justify-center py-10 text-center">
            <h1 className="text-[24px] font-bold text-[#1F2937] dark:text-[#F1F5F9]">
              Two-factor setup required
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              This account must finish setting up two-factor authentication
              before it can sign in. Please contact your administrator to
              complete the setup, then try again.
            </p>
            <div className="mt-8">
              <PrimaryButton type="button" onClick={goSignIn}>
                Back to sign in
              </PrimaryButton>
            </div>
          </div>
        )}

        {mode === 'verify' && challenge && (
          <div className="flex flex-1 flex-col">
            <h1 className="mt-5 text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
              Two-factor authentication
            </h1>
            <p className="mt-2.5 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              {useRecovery
                ? 'Enter one of your saved recovery codes.'
                : challenge.method === 'totp'
                  ? 'Enter the 6-digit code from your authenticator app.'
                  : `Enter the 6-digit code we sent to your ${
                      challenge.method === 'sms'
                        ? challenge.phoneMasked ?? 'phone'
                        : challenge.emailMasked ?? 'email address'
                    }.`}
            </p>

            {useRecovery ? (
              <div className="mt-8">
                <AuthInput
                  aria-label="Recovery code"
                  placeholder="e.g. 4F7K-9Q2M"
                  autoComplete="off"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                />
              </div>
            ) : (
              <div className="mt-10">
                <OtpBoxes boxes={boxes} setBoxes={setBoxes} onComplete={(c) => verify(c)} disabled={submitting} />
              </div>
            )}

            {error && (
              <div className="mt-5">
                <AuthError>{error}</AuthError>
              </div>
            )}

            {!useRecovery && challenge.method !== 'totp' && (
              <div className="mt-6 text-center">
                {resendSeconds > 0 ? (
                  <span className="text-[14px] text-[#94A3B8] dark:text-white/40">
                    Resend code in {resendSeconds}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => sendCode()}
                    disabled={sending}
                    className="text-[14px] font-semibold text-[#034548] transition-opacity hover:opacity-80 disabled:opacity-60 dark:text-[#30A9A2]"
                  >
                    {sending ? 'Sending…' : 'Resend code'}
                  </button>
                )}
              </div>
            )}

            <div className="flex-1" />

            <div className="pb-10 pt-6">
              <PrimaryButton
                type="button"
                onClick={() => verify()}
                loading={submitting}
                disabled={useRecovery ? recoveryCode.trim().length === 0 : boxes.join('').length !== 6}
              >
                {useRecovery ? 'Use recovery code' : 'Verify'}
              </PrimaryButton>

              {challenge.recoveryCodesAvailable && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecovery((u) => !u);
                      setError('');
                    }}
                    className="text-[13px] font-medium text-[#034548] transition-opacity hover:opacity-80 dark:text-[#30A9A2]"
                  >
                    {useRecovery ? 'Use my second factor instead' : 'Use a recovery code instead'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'saved' && recoveryCodes && (
          <div className="mt-8 flex flex-1 flex-col">
            <h1 className="text-[24px] font-bold text-[#1F2937] dark:text-[#F1F5F9]">
              Save your recovery codes
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              Each code works once if you ever lose access to your second
              factor. Store them somewhere safe — this is the only time
              they&apos;re shown.
            </p>

            <ul className="mt-6 grid grid-cols-2 gap-2 rounded-[12px] bg-[#F1F5F9] p-4 font-mono text-[13px] tracking-wide text-[#1F2937] dark:bg-white/5 dark:text-[#F1F5F9]">
              {recoveryCodes.map((c) => (
                <li key={c} className="text-center">
                  {c}
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(recoveryCodes.join('\n'))
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false));
                }}
                className="text-[13px] font-medium text-[#034548] transition-opacity hover:opacity-80 dark:text-[#30A9A2]"
              >
                {copied ? 'Copied!' : 'Copy all codes'}
              </button>
            </div>

            <div className="flex-1" />

            <div className="pb-10 pt-6">
              <PrimaryButton type="button" onClick={() => router.replace(landingPath())}>
                I&apos;ve saved them — Continue
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </AuthFrame>
  );
}
