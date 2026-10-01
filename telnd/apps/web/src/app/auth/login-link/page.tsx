'use client';

// Landing page for the magic link in "Send me a login link" emails. The
// click carries the single-use token; this spends it via
// POST /api/auth/login-link/verify — the session cookies arrive with the
// answer — and drops the visitor on the site. A dead or already-used link
// says so plainly instead of a silent failure.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { authErrorMessage, landingPath } from '@/lib/auth';
import { AuthFrame, AuthTopBar, PrimaryButton, Spinner } from '@/components/auth/AuthUI';

type Mode = 'verifying' | 'failed';

export default function AuthLoginLinkPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('verifying');
  const [message, setMessage] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setMessage('This sign-in link is invalid or has expired. Please request a new one.');
      setMode('failed');
      return;
    }

    api
      .post('/api/auth/login-link/verify', { token })
      .then(() => {
        router.replace(landingPath());
      })
      .catch((err: unknown) => {
        setMessage(
          authErrorMessage(
            err,
            'This sign-in link is invalid or has expired. Please request a new one.',
          ),
        );
        setMode('failed');
      });
  }, [router]);

  return (
    <AuthFrame>
      <div className="pt-4">
        <AuthTopBar backHref="/auth" />
      </div>

      <div className="flex flex-1 flex-col px-6">
        {mode === 'verifying' ? (
          <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center gap-4 py-10 text-[#034548] dark:text-[#30A9A2]">
            <Spinner className="h-8 w-8" />
            <p className="text-[14px] text-[#64748B] dark:text-white/50">
              Signing you in…
            </p>
          </div>
        ) : (
          <div className="flex min-h-[260px] flex-1 flex-col justify-center py-10 text-center">
            <h1 className="text-[24px] font-bold text-[#1F2937] dark:text-[#F1F5F9]">
              Link not usable
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              {message}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              You can request a fresh one from the sign-in screen.
            </p>
            <div className="mt-8">
              <PrimaryButton type="button" onClick={() => router.replace('/auth')}>
                Back to sign in
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </AuthFrame>
  );
}
