'use client';

// Sign-in-or-create's wizard (§14.49) — the finish side of every channel
// proof. The email 6-digit code, the phone OTP and the login-link click
// all land HERE with proof in hand, and the account only exists after the
// last step. Steps, in order:
//
//   otp      — email channel only: enter the code (/signup/verify-otp
//              spends it and hands back the one-time signup token)
//   password — choose the sign-in password (asked AFTER the proof — the
//              reordering this round exists for)
//   profile  — basic information (first + last name, plus an optional
//              phone number — hidden on the phone channel, whose number
//              is the proven identifier) → "Sign up"
//   done     — /signup/complete burns the token, creates the candidate
//              account and hands back the session cookies
//
// Entry points: ?email=… opens at otp; ?token=… (phone OTP verified, or a
// login-link click) runs /signup/check first and skips straight to
// password. Nothing about the account exists until the final POST
// succeeds. A verification code is NEVER rendered on this page — the API's
// dev-only code echo is a test seam for automated suites, not UI.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { authErrorCode, authErrorMessage, landingPath, useCountdown } from '@/lib/auth';
import {
  AuthError,
  AuthFrame,
  AuthInput,
  AuthTopBar,
  OtpBoxes,
  PrimaryButton,
  Spinner,
} from '@/components/auth/AuthUI';
import { EyeIcon, EyeOffIcon, PasswordIcon } from '@/components/auth/icons';

type Step = 'checking' | 'otp' | 'password' | 'profile' | 'invalid' | 'exists';

interface CheckData {
  valid?: boolean;
  accountExists?: boolean;
  identifier?: string | null;
  channel?: string;
}

/** The only country line live — same fixed chip the phone screen uses. */
const COUNTRY_CODE = '+880';

/** Digits only, no leading zero, capped at 10 — one rule for typing and paste. */
function sanitizeNumber(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
}

export default function AuthVerifyEmailPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('checking');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [boxes, setBoxes] = useState<string[]>(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // Optional profile phone (digits under the fixed +880 chip). Empty is
  // valid; on the phone channel the field isn't rendered at all — that
  // number was proven by OTP and is not editable here.
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useCountdown(60);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      // Phone/link channels: the proof already happened — check what the
      // token opens (already-raced → "sign in instead"; dead → refusal),
      // then straight to the password step.
      setToken(t);
      api
        .post<{ data?: CheckData }>('/api/auth/signup/check', { token: t })
        .then((res) => {
          const data = res?.data;
          if (data?.accountExists) {
            setStep('exists');
            return;
          }
          if (!data?.valid) {
            setStep('invalid');
            return;
          }
          setIdentifier(data.identifier ?? '');
          setChannel(data.channel ?? '');
          setStep('password');
        })
        .catch(() => setStep('invalid'));
      return;
    }

    const address = params.get('email');
    if (address) {
      setEmail(address);
      setStep('otp');
      return;
    }

    setStep('invalid');
  }, []);

  const code = boxes.join('');
  const codeComplete = code.length === 6;

  // Email channel: spend the 6-digit code, collect the signup token and
  // move on to the password step. Wrong / expired / unknown all keep the
  // same "invalid or expired" copy — no oracle between them.
  async function verifyCode(value?: string) {
    const entered = value ?? code;
    if (entered.length !== 6 || !email || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = (await api.post('/api/auth/signup/verify-otp', { email, code: entered })) as {
        data?: { requiresProfile?: boolean; signupToken?: string };
      };
      const next = res?.data?.signupToken;
      if (!next) {
        setError('Something went wrong. Please request a new code.');
        setSubmitting(false);
        return;
      }
      setToken(next);
      setStep('password');
      setSubmitting(false);
    } catch (err) {
      const c = authErrorCode(err);
      if (c === 'OTP_INVALID' || c === 'OTP_TOO_MANY_ATTEMPTS') {
        setError(authErrorMessage(err, 'That code is invalid or has expired. Please try again.'));
        setBoxes(['', '', '', '', '', '']);
      } else if (c === 'METHOD_DISABLED') {
        setError(authErrorMessage(err, 'This sign-in method is currently unavailable.'));
      } else {
        setError(authErrorMessage(err, 'The code could not be verified. Please try again.'));
      }
      setSubmitting(false);
    }
  }

  // Resend the code to the same mailbox. The server's 45-second gap
  // answers the same "verification required" shape, so a resend always
  // lands back on this screen with a fresh countdown.
  async function resend() {
    if (sending || resendSeconds > 0) return;
    setError('');
    setSending(true);
    try {
      const res = (await api.post('/api/auth/signup/start', { email })) as {
        data?: { accountExists?: boolean };
      };
      if (res?.data?.accountExists) {
        // An account appeared while this code was pending — stop asking
        // for a code that will never come and point at sign-in.
        setStep('exists');
        return;
      }
      // Whatever the API echoed on dev, nothing is forwarded or rendered
      // here — a verification code never appears on a screen.
      setBoxes(['', '', '', '', '', '']);
      setResendSeconds(60);
    } catch (err) {
      setError(authErrorMessage(err, 'A new code could not be sent. Please try again.'));
    } finally {
      setSending(false);
    }
  }

  // Last step: burn the one-time token, create the account, land signed in.
  async function finish(e?: FormEvent) {
    e?.preventDefault();
    const fn = firstName.trim();
    const ln = lastName.trim();
    const ph = phone.trim();
    if (submitting || !fn || !ln || password.length < 8) return;
    // Optional means empty-or-complete: a half-typed number never reaches
    // the API (the API re-validates and normalizes to +880…).
    if (ph && ph.length !== 10) {
      setError('Enter a valid 10-digit phone number, or leave the field blank.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/auth/signup/complete', {
        token,
        firstName: fn,
        lastName: ln,
        password,
        ...(ph ? { phone: `${COUNTRY_CODE}${ph}` } : {}),
      });
      // Session cookies arrived with the answer — same landing as any
      // other sign-in (the page the trip started from, consumed here).
      router.replace(landingPath());
    } catch (err) {
      const c = authErrorCode(err);
      if (c === 'SIGNUP_TOKEN_INVALID') {
        setStep('invalid');
      } else if (c === 'USER_EXISTS') {
        setStep('exists');
      } else if (c === 'PHONE_INVALID' || c === 'PHONE_IN_USE') {
        // Fixable right here — the token is still live (the uniqueness
        // check runs before it is spent), so stay on the form.
        setError(authErrorMessage(err, 'That phone number cannot be used. Please check it.'));
      } else if (c === 'METHOD_DISABLED') {
        setError(authErrorMessage(err, 'This sign-in method is currently unavailable.'));
      } else {
        setError(authErrorMessage(err, 'Your account could not be created. Please try again.'));
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame>
      <div className="pt-4">
        <AuthTopBar backHref="/auth" />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-6">
        {step === 'checking' && (
          <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center gap-4 py-10 text-[#034548] dark:text-[#30A9A2]">
            <Spinner className="h-8 w-8" />
            <p className="text-[14px] text-[#64748B] dark:text-white/50">
              Checking your link…
            </p>
          </div>
        )}

        {step === 'otp' && (
          <>
            <h1 className="mt-5 text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
              Verify your email
            </h1>
            <p className="mt-2.5 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              Enter the 6-digit code we sent to{' '}
              <span className="font-semibold break-all">{email}</span>.
            </p>

            <div className="mt-10">
              <OtpBoxes boxes={boxes} setBoxes={setBoxes} onComplete={(c) => verifyCode(c)} disabled={submitting} />
            </div>

            {error && (
              <div className="mt-5">
                <AuthError>{error}</AuthError>
              </div>
            )}

            <div className="mt-7 text-center">
              {resendSeconds > 0 ? (
                <span className="text-[14px] text-[#94A3B8] dark:text-white/40">
                  Resend code in {resendSeconds}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={resend}
                  disabled={sending}
                  className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#034548] transition-opacity hover:opacity-80 disabled:opacity-60 dark:text-[#30A9A2]"
                >
                  {sending && <Spinner className="h-4 w-4" />}
                  {sending ? 'Sending…' : 'Resend code'}
                </button>
              )}
            </div>
          </>
        )}

        {step === 'password' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password.length < 8) return;
              setError('');
              setStep('profile');
            }}
          >
            <h1 className="mt-5 text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
              Set your password
            </h1>
            <p className="mt-2.5 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              Your identity is verified{identifier ? (
                <>
                  {' '}for <span className="font-semibold">{identifier}</span>
                </>
              ) : null}
              . Choose the password you&apos;ll sign in with.
            </p>

            <div className="mt-8">
              <label
                htmlFor="signup-password"
                className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
              >
                Password
              </label>
              <div className="mt-2">
                <AuthInput
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  prefix={<PasswordIcon className="h-5 w-5" />}
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-black/40 transition-colors hover:text-black/70 dark:text-white/40 dark:hover:text-white/70"
                    >
                      {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-2 text-[13px] text-[#94A3B8] dark:text-white/40">
                  At least 8 characters.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-5">
                <AuthError>{error}</AuthError>
              </div>
            )}
          </form>
        )}

        {step === 'profile' && (
          <>
            <h1 className="mt-5 text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
              Create your account
            </h1>
            <p className="mt-2.5 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              {identifier ? (
                <>
                  We verified <span className="font-semibold">{identifier}</span>.
                  Just your basic information to finish.
                </>
              ) : (
                'Your email is verified — just your basic information to finish.'
              )}
            </p>

            <form onSubmit={finish} className="mt-7 space-y-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
                >
                  First name
                </label>
                <div className="mt-2">
                  <AuthInput
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
                >
                  Last name
                </label>
                <div className="mt-2">
                  <AuthInput
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              {channel !== 'phone' && (
                <div>
                  <label
                    htmlFor="signup-phone"
                    className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
                  >
                    Phone number{' '}
                    <span className="font-normal text-[#94A3B8] dark:text-white/40">(optional)</span>
                  </label>
                  {/* Same fixed +880 chip as the phone screen — no picker. */}
                  <div className="mt-2 flex items-stretch gap-3">
                    <div className="flex h-[52px] shrink-0 items-center rounded-[14px] bg-[#F1F5F9] px-3.5 text-[15px] font-medium text-[#1F2937] dark:bg-white/5 dark:text-white">
                      {COUNTRY_CODE}
                    </div>
                    <div className="min-w-0 flex-1">
                      <AuthInput
                        id="signup-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder="1XXXXXXXXX"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(sanitizeNumber(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>
          </>
        )}

        {step === 'invalid' && (
          <div className="flex min-h-[260px] flex-1 flex-col justify-center py-10 text-center">
            <h1 className="text-[24px] font-bold text-[#1F2937] dark:text-[#F1F5F9]">
              Link not usable
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              This link is invalid or has expired. Please start again from the
              sign-in screen.
            </p>
            <div className="mt-8">
              <PrimaryButton type="button" onClick={() => router.replace('/auth')}>
                Back to sign in
              </PrimaryButton>
            </div>
          </div>
        )}

        {step === 'exists' && (
          <div className="flex min-h-[260px] flex-1 flex-col justify-center py-10 text-center">
            <h1 className="text-[24px] font-bold text-[#1F2937] dark:text-[#F1F5F9]">
              You already have an account
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              An account already exists for this address. Sign in instead —
              your account is waiting.
            </p>
            <div className="mt-8">
              <PrimaryButton type="button" onClick={() => router.replace('/auth')}>
                Go to sign in
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>

      {step === 'otp' && (
        <div className="px-6 pb-10 pt-6">
          <PrimaryButton
            type="button"
            onClick={() => verifyCode()}
            loading={submitting}
            disabled={!codeComplete}
          >
            Verify
          </PrimaryButton>
        </div>
      )}

      {step === 'password' && (
        <div className="px-6 pb-10 pt-6">
          <PrimaryButton
            type="button"
            onClick={() => {
              setError('');
              setStep('profile');
            }}
            disabled={password.length < 8}
          >
            Continue
          </PrimaryButton>
        </div>
      )}

      {step === 'profile' && (
        <div className="px-6 pb-10 pt-6">
          {error && (
            <div className="mb-4">
              <AuthError>{error}</AuthError>
            </div>
          )}
          <PrimaryButton
            type="button"
            onClick={() => finish()}
            loading={submitting}
            disabled={!firstName.trim() || !lastName.trim() || password.length < 8}
          >
            Sign up
          </PrimaryButton>
        </div>
      )}
    </AuthFrame>
  );
}
