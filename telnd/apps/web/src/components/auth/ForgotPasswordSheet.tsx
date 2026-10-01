'use client';

// The forgot-password bottom sheet from the app's
// forgot_password_bottom_sheet.dart — same drag handle, title, copy and
// 52px button — plus the honest success state the wired endpoint needs:
// the API answers "If an account exists…" for every address, so the sheet
// says exactly that instead of pretending to know.

import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth';
import { PrimaryButton, AuthInput } from './AuthUI';
import { CloseIcon, EnvelopeIcon } from './icons';

export function ForgotPasswordSheet({
  open,
  onClose,
  email,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
}) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // The sheet opens from the password field — start it on the account's
  // address, the way a pre-filled field would feel on a phone.
  useEffect(() => {
    if (open) {
      setValue(email);
      setSent(false);
      setError('');
      setSending(false);
    }
  }, [open, email]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || sending) return;
    setError('');
    setSending(true);
    try {
      await api.post('/api/auth/forgot-password', { email: value.trim() });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? authErrorMessage(err, 'The reset link could not be sent. Please try again.')
          : 'The reset link could not be sent. Please try again.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      {/* Scrim — click to dismiss, like dragging the sheet down */}
      <button
        type="button"
        aria-label="Close"
        title="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reset your password"
        className="relative w-full max-w-md rounded-t-[28px] bg-white px-6 pb-8 pt-6 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] dark:bg-[#1C1C1E] lg:rounded-[28px] lg:shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-start justify-between">
          <span
            aria-hidden="true"
            className="mx-auto h-1 w-10 rounded-full bg-[#E2E8F0] dark:bg-white/15"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-[10px] text-[#1F2937] transition-colors hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {!sent ? (
          <form onSubmit={submit} className="mt-5">
            <h2 className="text-[18px] font-semibold text-[#1F2937] dark:text-[#F1F5F9]">
              Reset your password
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </p>

            <div className="mt-5">
              <AuthInput
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-label="Email address"
                prefix={<EnvelopeIcon className="h-5 w-5" />}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 text-[13px] text-[#B42318] dark:text-red-300"
              >
                {error}
              </p>
            )}

            <div className="mt-5">
              <PrimaryButton type="submit" loading={sending} disabled={!value.trim()}>
                Send reset link
              </PrimaryButton>
            </div>
          </form>
        ) : (
          <div className="mt-5">
            <h2 className="text-[18px] font-semibold text-[#1F2937] dark:text-[#F1F5F9]">
              Check your inbox
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              If an account exists for <span className="font-medium text-[#1F2937] dark:text-white/80">{value.trim()}</span>,
              a password reset link is on its way. It expires in 60 minutes.
            </p>
            <div className="mt-5">
              <PrimaryButton type="button" onClick={onClose}>
                Close
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
