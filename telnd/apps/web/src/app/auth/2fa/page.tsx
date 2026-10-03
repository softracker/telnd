'use client';

// Two-factor challenge — what happens when /api/auth/login answers
// requires2FA (an enrolled second factor, or a forced-setup account).
// Same design language as the OTP step: six boxes, resend countdown,
// recovery-code escape hatch. Forced enrollment had no portal self-setup
// flow ("contact your administrator" — a dead end); §14.61 gives it one,
// mirroring the panel's /2fa screen: pick a factor (authenticator app
// with QR, SMS or email codes — each gated on availability), prove it,
// done. The challenge screen also offers "trust this device": a checked
// box (the default) rides the verify request and the API mints the
// 30-day trusted-device grant for USER accounts, so the next sign-in
// here skips this whole question.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
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
  smsAvailable: boolean;
  smsConfigured: boolean;
  emailAvailable: boolean;
  emailConfigured: boolean;
  recoveryCodesAvailable: boolean;
};

type Mode = 'loading' | 'expired' | 'enrollment' | 'verify' | 'saved';
type EnrollStep = 'choose' | 'totp' | 'sms' | 'email';

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
  // Forced-setup flow (§14.61): which factor the operator is setting up,
  // the authenticator secret once one is minted, the setup spinner, and
  // the trust-this-device choice (default on — checked is how the grant
  // actually gets used; recovery-code sign-ins never mint one).
  const [enrollStep, setEnrollStep] = useState<EnrollStep>('choose');
  const [setup, setSetup] = useState<{ otpauthUri: string; secret: string } | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);

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
      // An enrollment screen names the channel it is setting up; an
      // enrolled challenge derives it from the stored method server-side.
      const body =
        mode === 'enrollment' && (enrollStep === 'sms' || enrollStep === 'email')
          ? { method: enrollStep }
          : {};
      await api.post('/api/auth/2fa/challenge/send', body);
      setResendSeconds(60);
    } catch (err) {
      setError(authErrorMessage(err, 'The code could not be sent. Please try again.'));
    } finally {
      setSending(false);
    }
  }, [setResendSeconds, mode, enrollStep]);

  // SMS/email challenges deliver on arrival — but once only (dev's
  // StrictMode double-mount must not double-send).
  useEffect(() => {
    if (!needsCodeSend || autoSent.current) return;
    autoSent.current = true;
    void sendCode();
  }, [needsCodeSend, sendCode]);

  async function verify(value?: string) {
    if (submitting || !challenge) return;
    // Enrolled challenge: the stored method decides. Forced setup: the
    // panel the operator just proved decides.
    const chosenMethod =
      mode === 'enrollment'
        ? enrollStep === 'totp'
          ? 'totp'
          : enrollStep === 'sms'
            ? 'sms'
            : enrollStep === 'email'
              ? 'email'
              : undefined
        : (challenge.method ?? undefined);
    const body: Record<string, unknown> = useRecovery
      ? { recoveryCode: recoveryCode.trim() }
      : { code: value ?? boxes.join(''), method: chosenMethod };
    if (!useRecovery && trustDevice) body.trustDevice = true;
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

  // First half of forced setup: mint the authenticator secret (the API
  // returns QR + secret) or fire the channel's OTP. The panel only opens
  // once its backend is ready, so nobody types into a dead form.
  async function startSetup(method: 'totp' | 'sms' | 'email') {
    if (setupBusy) return;
    setSetupBusy(true);
    setError('');
    try {
      if (method === 'totp') {
        const res = await api.post<{ data?: { otpauthUri: string; secret: string } }>(
          '/api/auth/2fa/challenge/setup',
          {},
        );
        if (!res.data?.otpauthUri) throw new Error('setup');
        setSetup(res.data);
      } else {
        setSetup(null);
        await api.post('/api/auth/2fa/challenge/send', { method });
        setResendSeconds(60);
      }
      setEnrollStep(method);
      setBoxes(['', '', '', '', '', '']);
    } catch (err) {
      setError(authErrorMessage(err, 'Two-factor setup could not start. Please try again.'));
    } finally {
      setSetupBusy(false);
    }
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

        {mode === 'enrollment' && challenge && (
          <div className="flex flex-1 flex-col">
            <h1 className="mt-5 text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
              Set up two-factor authentication
            </h1>
            <p className="mt-2.5 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              This account signs in with a second factor. Choose how you&apos;ll get your
              codes, prove it once below, and you&apos;re in.
            </p>

            {error && (
              <div className="mt-5">
                <AuthError>{error}</AuthError>
              </div>
            )}

            {enrollStep === 'choose' && (
              <div className="mt-6 space-y-3">
                {(() => {
                  const smsNote = !challenge.smsConfigured
                    ? 'SMS codes are not available on this site yet.'
                    : !challenge.smsAvailable
                      ? 'Add a verified phone number to use SMS codes.'
                      : null;
                  const emailNote = !challenge.emailConfigured
                    ? 'Email codes are not available on this site yet.'
                    : !challenge.emailAvailable
                      ? 'Add an email address to use email codes.'
                      : null;
                  const optionClass =
                    'block w-full rounded-[14px] bg-[#F1F5F9] px-4 py-4 text-left transition-colors disabled:cursor-default disabled:opacity-60 dark:bg-white/5';
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => void startSetup('totp')}
                        disabled={setupBusy}
                        className={`${optionClass} hover:bg-[#E7EDF3] dark:hover:bg-white/10`}
                        title="Set up an authenticator app"
                      >
                        <span className="block text-[15px] font-semibold text-[#1F2937] dark:text-[#F1F5F9]">
                          Authenticator app
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-[#64748B] dark:text-white/50">
                          Scan a QR code with Google Authenticator, Authy, 1Password or similar.
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void startSetup('sms')}
                        disabled={Boolean(smsNote) || setupBusy}
                        className={`${optionClass} ${smsNote ? '' : 'hover:bg-[#E7EDF3] dark:hover:bg-white/10'}`}
                        title="Use codes sent by SMS"
                      >
                        <span className="block text-[15px] font-semibold text-[#1F2937] dark:text-[#F1F5F9]">
                          SMS code
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-[#64748B] dark:text-white/50">
                          A 6-digit code texted to {challenge.phoneMasked ?? 'your phone'} each time you sign in.
                        </span>
                        {smsNote && (
                          <span className="mt-1.5 block text-[12px] text-[#B45309] dark:text-amber-300">{smsNote}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void startSetup('email')}
                        disabled={Boolean(emailNote) || setupBusy}
                        className={`${optionClass} ${emailNote ? '' : 'hover:bg-[#E7EDF3] dark:hover:bg-white/10'}`}
                        title="Use codes sent by email"
                      >
                        <span className="block text-[15px] font-semibold text-[#1F2937] dark:text-[#F1F5F9]">
                          Email code
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-[#64748B] dark:text-white/50">
                          A 6-digit code sent to {challenge.emailMasked ?? 'your mailbox'} each time you sign in.
                        </span>
                        {emailNote && (
                          <span className="mt-1.5 block text-[12px] text-[#B45309] dark:text-amber-300">{emailNote}</span>
                        )}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}

            {enrollStep === 'totp' && setup && (
              <div className="mt-6">
                <p className="text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
                  Scan this with your authenticator app, then enter the 6-digit code it shows.
                  Can&apos;t scan? Enter the key by hand.
                </p>
                <div className="mt-4 flex flex-wrap items-start gap-4">
                  <span className="inline-block rounded-[14px] bg-white p-2 shadow-sm dark:bg-white">
                    <QRCodeSVG value={setup.otpauthUri} size={148} marginSize={0} />
                  </span>
                  <p className="min-w-0 max-w-full break-all rounded-[10px] bg-[#F1F5F9] px-3 py-2 font-mono text-[13px] text-[#1F2937] dark:bg-white/5 dark:text-[#F1F5F9]">
                    {setup.secret}
                  </p>
                </div>
                <div className="mt-6">
                  <OtpBoxes boxes={boxes} setBoxes={setBoxes} onComplete={(c) => verify(c)} disabled={submitting} />
                </div>
              </div>
            )}

            {(enrollStep === 'sms' || enrollStep === 'email') && (
              <div className="mt-6">
                <p className="text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
                  We sent a 6-digit code to{' '}
                  {enrollStep === 'sms' ? challenge.phoneMasked ?? 'your phone' : challenge.emailMasked ?? 'your mailbox'}
                  . Enter it below to finish.
                </p>
                <div className="mt-5">
                  <OtpBoxes boxes={boxes} setBoxes={setBoxes} onComplete={(c) => verify(c)} disabled={submitting} />
                </div>
                <div className="mt-4 text-center">
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
              </div>
            )}

            {enrollStep !== 'choose' && (
              <>
                <label className="mt-6 flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#034548]"
                  />
                  <span className="text-[13px] leading-relaxed text-[#64748B] dark:text-white/50">
                    Trust this device for 30 days — skip the code the next time you sign in from this browser.
                  </span>
                </label>

                <div className="flex-1" />

                <div className="pb-10 pt-6">
                  <PrimaryButton
                    type="button"
                    onClick={() => verify()}
                    loading={submitting}
                    disabled={boxes.join('').length !== 6}
                  >
                    Turn on two-factor
                  </PrimaryButton>

                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEnrollStep('choose');
                        setSetup(null);
                        setBoxes(['', '', '', '', '', '']);
                        setError('');
                      }}
                      className="text-[13px] font-medium text-[#034548] transition-opacity hover:opacity-80 dark:text-[#30A9A2]"
                    >
                      Choose a different method
                    </button>
                  </div>
                </div>
              </>
            )}
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

            {!useRecovery && (
              <label className="mt-6 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#034548]"
                />
                <span className="text-[13px] leading-relaxed text-[#64748B] dark:text-white/50">
                  Trust this device for 30 days — skip the code the next time you sign in from this browser.
                </span>
              </label>
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
