'use client';

// "Verify your number" — the app's auth_otp_page.dart: six 48×56 boxes
// with auto-advance, a 60-second resend countdown, Verify at the bottom.
// Wired: the code finishes the phone sign-in through /api/auth/login
// { phone, otp }; Resend re-asks /api/auth/otp/request.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  authErrorMessage,
  authErrorCode,
  landingPath,
  useCountdown,
} from '@/lib/auth';
import {
  AuthError,
  AuthFrame,
  AuthTopBar,
  OtpBoxes,
  PrimaryButton,
  Spinner,
} from '@/components/auth/AuthUI';

export default function AuthOtpPage() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<string[]>(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useCountdown(60);

  // The phone number arrives with the navigation; without it there is
  // nothing to verify against — send the visitor back to step one.
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('phone');
    if (!initial) {
      router.replace('/auth/phone');
      return;
    }
    setPhone(initial);
  }, [router]);

  const code = boxes.join('');
  const complete = code.length === 6;

  async function verify(value?: string) {
    const otp = value ?? code;
    if (otp.length !== 6 || !phone || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = (await api.post('/api/auth/login', { phone, otp, context: 'portal' })) as {
        data?: { requires2FA?: boolean; requiresProfile?: boolean; signupToken?: string };
      };
      if (res?.data?.requiresProfile) {
        // The OTP proved a number with no account behind it — finish
        // creating it (name step) on the shared signup screen.
        const token = res.data.signupToken;
        router.replace(
          token ? `/auth/verify-email?token=${encodeURIComponent(token)}` : '/auth',
        );
        return;
      }
      if (res?.data?.requires2FA) {
        router.replace('/auth/2fa');
        return;
      }
      router.replace(landingPath());
    } catch (err) {
      setError(
        authErrorCode(err) === 'METHOD_DISABLED'
          ? authErrorMessage(err, 'Phone sign-in is currently unavailable.')
          : authErrorMessage(err, 'That code is invalid or has expired. Please try again.'),
      );
      setBoxes(['', '', '', '', '', '']);
      setSubmitting(false);
    }
  }

  async function resend() {
    if (!phone || sending || resendSeconds > 0) return;
    setError('');
    setSending(true);
    try {
      await api.post('/api/auth/otp/request', { phone });
      setResendSeconds(60);
      setBoxes(['', '', '', '', '', '']);
    } catch (err) {
      setError(authErrorMessage(err, 'The code could not be sent. Please try again.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthFrame>
      <div className="pt-4">
        <AuthTopBar backHref="/auth/phone" />
      </div>

      <div className="flex flex-1 flex-col px-6">
        <div className="flex-1">
          <h1 className="mt-5 text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
            Verify your number
          </h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
            Enter the 6-digit code we sent to your phone.
          </p>

          <div className="mt-10">
            <OtpBoxes boxes={boxes} setBoxes={setBoxes} onComplete={(c) => verify(c)} disabled={submitting} />
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
        </div>

        <div className="pb-10 pt-6">
          <PrimaryButton type="button" onClick={() => verify()} loading={submitting} disabled={!complete}>
            Verify
          </PrimaryButton>
        </div>
      </div>
    </AuthFrame>
  );
}
