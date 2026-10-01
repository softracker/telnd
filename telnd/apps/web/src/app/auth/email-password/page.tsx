'use client';

// "Enter your password" — step two of the email flow (the app's
// auth_email_password_page.dart), wired: Log in posts to /api/auth/login,
// "I forgot my password" opens the sheet, "Send me a login link" asks the
// API for a magic link. The Login Providers switches decide which halves
// render: passwordless-only accounts never see the field, link-off
// accounts never see the action. This screen is only reached for
// addresses that PASSED the account check at /auth/email; if login still
// answers "no account yet" (edge: it vanished in between), the visitor is
// handed to the emailed-code wizard — never a status box.

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  DEFAULT_PROVIDERS,
  authErrorCode,
  authErrorMessage,
  fetchProviders,
  landingPath,
  type ProviderFlags,
} from '@/lib/auth';
import {
  AuthError,
  AuthFrame,
  AuthInput,
  AuthTopBar,
  PrimaryButton,
  Spinner,
  TopAction,
} from '@/components/auth/AuthUI';
import { EyeIcon, EyeOffIcon, PasswordIcon } from '@/components/auth/icons';
import { ForgotPasswordSheet } from '@/components/auth/ForgotPasswordSheet';

export default function AuthEmailPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // After a refused attempt the visitor's hands are still on the keyboard
  // — put the cursor back in the password box (selecting the wrong value
  // so the next keystroke replaces it) instead of making them click.
  const passwordRef = useRef<HTMLInputElement>(null);
  const [providers, setProviders] = useState<ProviderFlags>(DEFAULT_PROVIDERS);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [linkSending, setLinkSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  // Turnstile — CAPTCHA arms itself after two failed attempts (mirrors the
  // admin login page: same script, same site key, same token hand-off).
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const showCaptcha = failedAttempts >= 2 && Boolean(turnstileSiteKey);

  // The flow hands the address over in the query; arriving cold (refresh,
  // pasted URL) sends the visitor back to step one instead of letting them
  // type a password for nobody.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('email');
    if (!initial) {
      router.replace('/auth/email');
      return;
    }
    setEmail(initial);

    let alive = true;
    fetchProviders().then((p) => {
      if (alive) setProviders(p);
    });
    fetch('/api/captcha-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.success && data?.data?.enabled && data?.data?.siteKey) {
          setTurnstileSiteKey(data.data.siteKey);
        }
      })
      .catch(() => {
        // captcha simply won't show
      });
    return () => {
      alive = false;
    };
  }, [router]);

  // Render Turnstile when it becomes required.
  useEffect(() => {
    if (!showCaptcha || !turnstileRef.current) return;

    if (!document.getElementById('turnstile-script')) {
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const renderWidget = () => {
      const w = window as unknown as {
        turnstile?: {
          render: (el: HTMLElement, opts: Record<string, unknown>) => string;
          reset: (id?: unknown) => void;
        };
      };
      if (turnstileRef.current && w.turnstile && !turnstileWidgetId.current) {
        turnstileWidgetId.current = w.turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          theme: 'light',
        });
      }
    };

    const w = window as unknown as { turnstile?: unknown };
    if (w.turnstile) {
      renderWidget();
      return;
    }
    const interval = setInterval(() => {
      if (w.turnstile) {
        clearInterval(interval);
        renderWidget();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [showCaptcha, turnstileSiteKey]);

  const showPasswordForm = providers.email;
  const showLinkAction = providers.emailLink;
  const hasPassword = password.length > 0;

  async function login(e?: FormEvent) {
    e?.preventDefault();
    if (!showPasswordForm || !hasPassword || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { email, password, context: 'portal' };
      if (showCaptcha) body.turnstileToken = turnstileToken;
      const res = (await api.post('/api/auth/login', body)) as {
        data?: {
          requires2FA?: boolean;
          requiresOtpVerification?: boolean;
        };
      };
      if (res?.data?.requiresOtpVerification) {
        // No account for this address — the account vanished between the
        // email step and here, or this tab predates the check. Login and
        // signup are one flow: hand off to the emailed-code wizard (§14.49)
        // and drop the password typed here; it is chosen again after the
        // code proves the mailbox. No code travels along — the portal
        // never forwards or renders one, whatever the API echoes on dev.
        const params = new URLSearchParams({ email });
        router.replace(`/auth/verify-email?${params.toString()}`);
        return;
      }
      if (res?.data?.requires2FA) {
        router.replace('/auth/2fa');
        return;
      }
      setFailedAttempts(0);
      router.replace(landingPath());
    } catch (err) {
      // Straight back to the password box — retry is the only thing this
      // screen is for after a refusal.
      passwordRef.current?.focus();
      passwordRef.current?.select();
      const code = authErrorCode(err);
      if (code === 'CAPTCHA_REQUIRED') {
        setError('Too many attempts. Please complete the verification below.');
        setFailedAttempts(3);
      } else if (code === 'CAPTCHA_FAILED') {
        setError('Verification failed. Please try the check again.');
        const w = window as unknown as { turnstile?: { reset: (id?: unknown) => void } };
        if (w.turnstile && turnstileWidgetId.current) {
          w.turnstile.reset(turnstileWidgetId.current);
          setTurnstileToken('');
        }
      } else if (code === 'ACCOUNT_LOCKED') {
        const retry = (err as { data?: { error?: { retryAfter?: number } } })?.data?.error?.retryAfter;
        setError(
          authErrorMessage(err, 'Too many failed attempts.') +
            (typeof retry === 'number' ? ` Try again in ${Math.ceil(retry / 60)} minute(s).` : ''),
        );
        setFailedAttempts(3);
      } else {
        setError(authErrorMessage(err, 'Sign-in failed. Please try again.'));
        setFailedAttempts((n) => n + 1);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function sendLoginLink() {
    if (linkSending || linkSent || !email) return;
    setError('');
    setLinkSending(true);
    try {
      await api.post('/api/auth/login-link', { email });
      setLinkSent(true);
    } catch (err) {
      setError(authErrorMessage(err, 'The login link could not be sent. Please try again.'));
    } finally {
      setLinkSending(false);
    }
  }

  return (
    <>
      <AuthFrame>
        <div className="pt-4">
          <AuthTopBar
            backHref={`/auth/email${email ? `?email=${encodeURIComponent(email)}` : ''}`}
            action={
              showPasswordForm ? (
                /* Mobile shortcut only — the desktop card keeps the one button. */
                <div className="md:hidden">
                  <TopAction onClick={() => login()} disabled={!hasPassword || submitting}>
                    {submitting ? 'Checking…' : 'Continue'}
                  </TopAction>
                </div>
              ) : null
            }
          />
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-6">
          <div className="flex-1">
            <h1 className="mt-5 text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
              Enter your password
            </h1>

            <p className="mt-2.5 text-[14px] text-[#64748B] dark:text-white/50">For</p>
            <div className="mt-1">
              <span className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#F1F5F9] px-3 py-2 text-[13px] font-medium text-[#1F2937] dark:bg-white/5 dark:text-white/70">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  className="text-[#64748B] dark:text-white/50"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 5L2 7" />
                </svg>
                {email}
              </span>
            </div>

            {showPasswordForm && (
              <form onSubmit={login} className="mt-7">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
                >
                  Password
                </label>
                <div className="mt-2">
                  <AuthInput
                    id="password"
                    ref={passwordRef}
                    /* Arriving from "Continue" at /auth/email — hands are
                       already on the keyboard, so the field takes the
                       cursor itself. */
                    autoFocus
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    onKeyDown={(e) => {
                      // Enter logs in. Explicit (and never mid-IME
                      // composition) so it never leans on the browser's
                      // implicit-submission quirks.
                      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        void login();
                      }
                    }}
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
                </div>

                <div className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-[13px] font-medium text-[#034548] transition-opacity hover:opacity-80 dark:text-[#30A9A2]"
                  >
                    I forgot my password
                  </button>
                </div>
              </form>
            )}

            {!showPasswordForm && !linkSent && (
              <p className="mt-4 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
                We&apos;ll email you a one-time link — no password needed.
              </p>
            )}

            {showLinkAction && linkSent && (
              <div
                role="status"
                className="mt-6 rounded-[12px] border border-[#A7DFDE] bg-[#EDF8F8] px-4 py-3 text-[14px] leading-relaxed text-[#034548] dark:border-[#30A9A2]/40 dark:bg-[#30A9A2]/10 dark:text-[#A7DFDE]"
              >
                If an account exists for{' '}
                <span className="font-semibold">{email}</span>, a login link is on
                its way. Check your inbox — and your spam folder.
              </div>
            )}
          </div>

          <div className="pb-10 pt-6">
            {error && (
              <div className="mb-4">
                <AuthError>{error}</AuthError>
              </div>
            )}

            {showCaptcha && (
              <div className="mb-4 flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-[#1F2937] dark:text-white/70">
                  Verification
                </span>
                <div ref={turnstileRef} />
              </div>
            )}

            {showPasswordForm && (
              <PrimaryButton type="button" onClick={() => login()} loading={submitting} disabled={!hasPassword}>
                Log in
              </PrimaryButton>
            )}

            {showLinkAction && !linkSent && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={sendLoginLink}
                  disabled={linkSending}
                  className="flex items-center gap-2 text-[14px] font-medium text-[#034548] transition-opacity hover:opacity-80 disabled:opacity-60 dark:text-[#30A9A2]"
                >
                  {linkSending && <Spinner className="h-4 w-4" />}
                  Send me a login link
                </button>
              </div>
            )}

            {!showPasswordForm && !showLinkAction && (
              <p className="text-center text-[14px] text-[#64748B] dark:text-white/50">
                Email sign-in is currently unavailable.
              </p>
            )}
          </div>
        </div>
      </AuthFrame>

      <ForgotPasswordSheet open={forgotOpen} onClose={() => setForgotOpen(false)} email={email} />
    </>
  );
}
