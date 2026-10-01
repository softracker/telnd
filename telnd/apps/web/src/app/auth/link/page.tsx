'use client';

// The proof screen behind a `requiresLink` answer (§14.48): the provider
// vouched for a VERIFIED email that already belongs to a TELND account —
// but a provider's view of an address is NOT proof the visitor controls
// the local account, so nothing attaches until that account's PASSWORD is
// proven. Same ladder as a normal sign-in: lockout, captcha from the
// second failure, and the answer's own errors rendered as-is. On success
// the identity lands and the session opens (or /auth/2fa takes over when
// a local second factor exists).

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { authErrorCode, authErrorMessage, landingPath } from '@/lib/auth';
import {
  AuthError,
  AuthFrame,
  AuthInput,
  AuthTopBar,
  PrimaryButton,
} from '@/components/auth/AuthUI';
import { EyeIcon, EyeOffIcon, PasswordIcon, FacebookIcon, GoogleIcon, LinkedInIcon } from '@/components/auth/icons';
import type { ComponentType } from 'react';

const PROVIDERS: Record<string, { label: string; Icon: ComponentType<{ className?: string }> }> = {
  google: { label: 'Google', Icon: GoogleIcon },
  facebook: { label: 'Facebook', Icon: FacebookIcon },
  linkedin: { label: 'LinkedIn', Icon: LinkedInIcon },
};

export default function AuthOAuthLinkPage() {
  const router = useRouter();
  const params = useParams<{ provider?: string }>();
  const provider = typeof params?.provider === 'string' ? params.provider : '';
  const meta = PROVIDERS[provider];

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  // Turnstile — arms after two wrong-password answers, exactly like the
  // password sign-in screen (same script, same site key, same hand-off).
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const showCaptcha = failedAttempts >= 2 && Boolean(turnstileSiteKey);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const query = new URLSearchParams(window.location.search);
    const t = query.get('token');
    const mail = query.get('email');
    if (!meta || !t || !mail) {
      // Arrived cold (refresh, pasted URL): there is nothing to prove for.
      setExpired(true);
      return;
    }
    setToken(t);
    setEmail(mail);

    let alive = true;
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
    // meta is derived from the route param — stable for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render Turnstile when it becomes required (same lifecycle as the
  // email-password screen).
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
          callback: (value: string) => setTurnstileToken(value),
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

  async function connect(e?: FormEvent) {
    e?.preventDefault();
    if (submitting || !password) return;
    setError('');
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { token, password };
      if (showCaptcha) body.turnstileToken = turnstileToken;
      const res = (await api.post('/api/auth/oauth/link', body)) as {
        data?: { requires2FA?: boolean };
      };
      if (res?.data?.requires2FA) {
        router.replace('/auth/2fa');
        return;
      }
      setFailedAttempts(0);
      router.replace(landingPath());
    } catch (err) {
      const code = authErrorCode(err);
      if (code === 'OAUTH_LINK_INVALID') {
        setExpired(true);
      } else if (code === 'CAPTCHA_REQUIRED') {
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
        setError(authErrorMessage(err, 'The accounts could not be connected. Please try again.'));
        setFailedAttempts((n) => n + 1);
      }
      setSubmitting(false);
    }
  }

  const MetaIcon = meta?.Icon;

  return (
    <AuthFrame>
      <div className="pt-4">
        <AuthTopBar backHref="/auth" />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-6">
        {expired ? (
          <div className="flex min-h-[260px] flex-1 flex-col justify-center py-10 text-center">
            <h1 className="text-[24px] font-bold text-[#1F2937] dark:text-[#F1F5F9]">
              Attempt expired
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              This connection attempt is no longer usable. Start again from the
              sign-in screen.
            </p>
            <div className="mt-8">
              <PrimaryButton type="button" onClick={() => router.replace('/auth')}>
                Back to sign in
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-center gap-2.5">
              {MetaIcon && <MetaIcon className="h-7 w-7" />}
              <h1 className="text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
                Connect your account
              </h1>
            </div>

            <p className="mt-2.5 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              An account already exists for this address. Enter its password to
              link your {meta?.label} sign-in — nothing is connected until
              then.
            </p>

            <div className="mt-4">
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

            <form onSubmit={connect} className="mt-7">
              <label
                htmlFor="password"
                className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
              >
                Password
              </label>
              <div className="mt-2">
                <AuthInput
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
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
            </form>
          </>
        )}
      </div>

      {!expired && (
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

          <PrimaryButton
            type="button"
            onClick={() => connect()}
            loading={submitting}
            disabled={!password}
          >
            Connect and continue
          </PrimaryButton>
        </div>
      )}
    </AuthFrame>
  );
}
