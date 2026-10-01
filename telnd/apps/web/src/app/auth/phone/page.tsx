'use client';

// "What's your phone number?" — the app's auth_phone_page.dart, minus the
// country-code picker: Bangladesh is the only line we ship, so the code is
// a fixed +880 chip and the number is a 10-digit field (a leading 0 is
// stripped as you type — +880 already carries the country, so 01XXXXXXXXXX
// would duplicate it). Send OTP posts to /api/auth/otp/request, which
// delivers a real login code; the API's answer never says whether the
// number has an account, so navigation always continues either way.

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PHONE_PATTERN, authErrorMessage, combinePhone } from '@/lib/auth';
import {
  AuthError,
  AuthFrame,
  AuthInput,
  AuthTopBar,
  PrimaryButton,
  TopAction,
} from '@/components/auth/AuthUI';

/** The only country line live — the picker was dropped for it. */
const COUNTRY_CODE = '+880';

/** Digits only, no leading zero, capped at 10 — one rule for typing and paste. */
function sanitizeNumber(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
}

export default function AuthPhonePage() {
  const router = useRouter();
  const [number, setNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const hasNumber = number.trim().length > 0;

  async function sendOtp(e?: FormEvent) {
    e?.preventDefault();
    if (!hasNumber || sending) return;
    const phone = combinePhone(COUNTRY_CODE, number);
    if (number.length !== 10 || !PHONE_PATTERN.test(phone)) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    setError('');
    setSending(true);
    try {
      await api.post('/api/auth/otp/request', { phone });
      router.push(`/auth/otp?phone=${encodeURIComponent(phone)}`);
    } catch (err) {
      setError(authErrorMessage(err, 'The code could not be sent. Please try again.'));
      setSending(false);
    }
    // On success the route changes; the flag stays true until then so the
    // button can't fire twice.
  }

  return (
    <AuthFrame>
      <div className="pt-4">
        <AuthTopBar
          backHref="/auth"
          action={
            /* Mobile shortcut only — the desktop card keeps the one button. */
            <div className="md:hidden">
              <TopAction onClick={() => sendOtp()} disabled={!hasNumber || sending}>
                Send OTP
              </TopAction>
            </div>
          }
        />
      </div>

      <form onSubmit={sendOtp} className="flex flex-1 flex-col px-6">
        <div className="flex-1">
          <h1 className="mt-5 text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
            What&apos;s your phone number?
          </h1>
          <p className="mt-2.5 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
            We&apos;ll send you a one-time verification code.
          </p>

          <div className="mt-8 flex items-stretch gap-3">
            {/* Fixed country code — nothing to pick, so no dropdown. */}
            <div className="flex h-[52px] shrink-0 items-center rounded-[14px] bg-[#F1F5F9] px-3.5 text-[15px] font-medium text-[#1F2937] dark:bg-white/5 dark:text-white">
              {COUNTRY_CODE}
            </div>
            <div className="min-w-0 flex-1">
              <AuthInput
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="1XXXXXXXXX"
                aria-label="Phone number"
                maxLength={10}
                value={number}
                onChange={(e) => setNumber(sanitizeNumber(e.target.value))}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4">
              <AuthError>{error}</AuthError>
            </div>
          )}
        </div>

        <div className="pb-10 pt-6">
          <PrimaryButton type="submit" loading={sending} disabled={!hasNumber}>
            Send OTP
          </PrimaryButton>
        </div>
      </form>
    </AuthFrame>
  );
}
