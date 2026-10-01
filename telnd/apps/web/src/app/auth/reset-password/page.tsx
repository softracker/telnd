'use client';

// Where the forgot-password email lands. Opens with the same dry-run the
// admin panel's set-password page does (POST /reset-password/check) so a
// dead link announces itself before anyone types a password, then consumes
// the token through /reset-password. Supporting flow — the app's design
// never reached this screen, so it follows the shared auth design language.

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth';
import {
  AuthError,
  AuthFrame,
  AuthInput,
  AuthTopBar,
  PrimaryButton,
} from '@/components/auth/AuthUI';
import { EyeIcon, EyeOffIcon, PasswordIcon } from '@/components/auth/icons';

type Mode = 'checking' | 'invalid' | 'form' | 'done';

export default function AuthResetPasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('checking');
  const [token, setToken] = useState<string | null>(null);
  const [checkMessage, setCheckMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    if (!t) {
      setCheckMessage('This password reset link is invalid or has expired.');
      setMode('invalid');
      return;
    }
    setToken(t);
    let alive = true;
    api
      .post('/api/auth/reset-password/check', { token: t })
      .then(() => {
        if (alive) setMode('form');
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setCheckMessage(
          authErrorMessage(err, 'This password reset link is invalid or has expired.'),
        );
        setMode('invalid');
      });
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token || submitting) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setMode('done');
    } catch (err) {
      setError(authErrorMessage(err, 'The password could not be updated. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame>
      <div className="pt-4">
        <AuthTopBar backHref="/auth" />
      </div>

      <div className="flex flex-1 flex-col px-6">
        {mode === 'checking' && (
          <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center py-10">
            <p className="text-center text-[14px] text-[#64748B] dark:text-white/50">
              Checking your link…
            </p>
          </div>
        )}

        {mode === 'invalid' && (
          <div className="flex min-h-[260px] flex-1 flex-col justify-center py-10 text-center">
            <h1 className="text-[24px] font-bold text-[#1F2937] dark:text-[#F1F5F9]">
              Link not usable
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              {checkMessage}
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

        {mode === 'form' && (
          <form onSubmit={submit} className="flex flex-1 flex-col">
            <div className="flex-1">
              <h1 className="mt-5 text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
                Set a new password
              </h1>
              <p className="mt-2.5 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
                Choose a new password for your account. Every existing sign-in
                ends once it&apos;s set.
              </p>

              <div className="mt-8 space-y-4">
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
                  >
                    New password
                  </label>
                  <div className="mt-2">
                    <AuthInput
                      id="new-password"
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
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
                  >
                    Confirm new password
                  </label>
                  <div className="mt-2">
                    <AuthInput
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat the password"
                      prefix={<PasswordIcon className="h-5 w-5" />}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4">
                  <AuthError>{error}</AuthError>
                </div>
              )}
            </div>

            <div className="pb-10 pt-6">
              <PrimaryButton
                type="submit"
                loading={submitting}
                disabled={password.length < 8 || confirm.length === 0}
              >
                Update password
              </PrimaryButton>
            </div>
          </form>
        )}

        {mode === 'done' && (
          <div className="flex min-h-[260px] flex-1 flex-col justify-center py-10 text-center">
            <h1 className="text-[24px] font-bold text-[#1F2937] dark:text-[#F1F5F9]">
              Password updated
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              Your new password is active. Sign in with it to continue.
            </p>
            <div className="mt-8">
              <PrimaryButton type="button" onClick={() => router.replace('/auth')}>
                Continue to sign in
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </AuthFrame>
  );
}
