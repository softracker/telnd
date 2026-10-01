'use client';

// "What's your email?" — step one of the email flow, and where
// sign-in-or-create splits (§14.49): POST /api/auth/signup/start says
// whether the address already has an account. Known → carry on to the
// password screen (unchanged path); unknown → the emailed 6-digit code
// opens the creation wizard at /auth/verify-email. The typed address
// travels in the query so a back-navigation lands pre-filled.

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { authErrorMessage, EMAIL_PATTERN } from '@/lib/auth';
import { AuthError, AuthFrame, AuthInput, AuthTopBar, PrimaryButton, TopAction } from '@/components/auth/AuthUI';
import { EnvelopeIcon } from '@/components/auth/icons';

export default function AuthEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('email');
    if (initial) setEmail(initial);
  }, []);

  const hasEmail = email.trim().length > 0;

  // One guard for both Continue buttons (top-right and the full-width
  // submit): the address must actually look like one — and both ride the
  // same account check, so neither can jump through unverified anymore.
  async function continueTo(e?: FormEvent) {
    e?.preventDefault();
    if (!hasEmail || checking) return;
    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setChecking(true);
    try {
      const res = (await api.post('/api/auth/signup/start', { email: address })) as {
        data?: {
          accountExists?: boolean;
          requiresOtpVerification?: boolean;
        };
      };
      if (res?.data?.requiresOtpVerification) {
        // No account yet — the 6-digit code is (or is being) on its way;
        // the wizard takes over from here. The API may echo the code
        // itself on dev responses (a test seam for the automated suites,
        // never in production) — the portal deliberately neither forwards
        // nor renders it: a verification code has no business on a screen.
        const params = new URLSearchParams({ email: address });
        router.push(`/auth/verify-email?${params.toString()}`);
        return;
      }
      // Account found (or an answer this build doesn't know): the
      // password screen is the next step — /login routes it onward if
      // the account vanished in between.
      router.push(`/auth/email-password?email=${encodeURIComponent(address)}`);
    } catch (err) {
      setError(authErrorMessage(err, 'We could not check that address. Please try again.'));
      setChecking(false);
    }
  }

  return (
    <AuthFrame>
      <div className="pt-4">
        <AuthTopBar
          backHref="/auth"
          action={
            /* Mobile shortcut only — the desktop card keeps the one button. */
            <div className="md:hidden">
              <TopAction onClick={() => continueTo()} disabled={!hasEmail || checking}>
                {checking ? 'Checking…' : 'Continue'}
              </TopAction>
            </div>
          }
        />
      </div>

      {/* noValidate: both buttons share continueTo's inline error instead of
          racing the browser's native tooltip. */}
      <form onSubmit={continueTo} noValidate className="flex flex-1 flex-col px-6">
        <div className="flex-1">
          <h1 className="mt-5 text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
            What&apos;s your email?
          </h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
            We&apos;ll check if you already have an account, or help you create
            one.
          </p>

          <div className="mt-8">
            <AuthInput
              type="email"
              inputMode="email"
              autoFocus
              autoComplete="email"
              placeholder="you@example.com"
              aria-label="Email address"
              prefix={<EnvelopeIcon className="h-5 w-5" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div className="mt-4">
              <AuthError>{error}</AuthError>
            </div>
          )}
        </div>

        <div className="pb-10 pt-6">
          <PrimaryButton type="submit" loading={checking} disabled={!hasEmail}>
            Continue
          </PrimaryButton>
        </div>
      </form>
    </AuthFrame>
  );
}
