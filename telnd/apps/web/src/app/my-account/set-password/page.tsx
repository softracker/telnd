'use client';

// Set a password (§14.64) — the FIRST one, for an account that has an
// email address but no hash yet (social signups; the login round is
// exactly email+password, which is why an addressless slot never offers
// this button). The live session is the proof: there is no old password
// to demand, and the §14.53 no-deadlock rule refuses to invent one.
// The floor and the bcrypt(12) are signup's, the API never overwrites
// an existing hash (an account that already has one is pointed at
// Forgot password instead), and the notice email that follows the write
// is the owner's only external signal that a credential now exists.
// Lives under /my-account: /auth/* would bounce a signed-in visitor
// out of the whole flow.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { authErrorCode, authErrorMessage } from '@/lib/auth';
import { AuthInput, PrimaryButton, Spinner } from '@/components/auth/AuthUI';
import { EyeIcon, EyeOffIcon } from '@/components/auth/icons';
import { useToast } from '@/components/account/Toast';

type Step = 'loading' | 'password' | 'blocked';

const card =
  'mt-4 max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5';
const primaryBtn =
  'inline-flex h-9 items-center rounded-[10px] bg-[#034548] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#025C5F] dark:bg-[#30A9A2] dark:text-[#0D0D0D] dark:hover:bg-[#37bdb6]';
const linkBtn =
  'text-[13px] font-medium text-[#034548] hover:underline dark:text-[#30A9A2]';

export default function SetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [blockedText, setBlockedText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast, toastView } = useToast();

  // Gate on entry: a password that already exists (or an account with
  // no email door to pair it with) has nothing to do here — say so and
  // point back at the summary. A failed probe just opens the form; the
  // POST re-checks both facts server-side.
  useEffect(() => {
    api
      .get<{ data: { email: string | null; hasPassword: boolean } }>('/api/account/methods')
      .then((res) => {
        if (res.data?.hasPassword) {
          setBlockedText('This account already has a password — use Forgot password on the sign-in page to change it.');
          setStep('blocked');
        } else if (!res.data?.email) {
          setBlockedText('Add an email address first — a password signs you in with it.');
          setStep('blocked');
        } else {
          setStep('password');
        }
      })
      .catch(() => setStep('password'));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || password.length < 8) return;
    setSaving(true);
    try {
      await api.post('/api/account/password', { password });
      router.replace('/my-account/sign-in-methods?added=password');
    } catch (err) {
      const code = authErrorCode(err);
      if (code === 'PASSWORD_EXISTS') {
        setBlockedText('This account already has a password — use Forgot password on the sign-in page to change it.');
        setStep('blocked');
      } else if (code === 'EMAIL_REQUIRED') {
        setBlockedText('Add an email address first — a password signs you in with it.');
        setStep('blocked');
      } else {
        showToast('error', authErrorMessage(err, 'The password could not be set. Please try again.'));
      }
      setSaving(false);
    }
  }

  return (
    <>
      {toastView}
      <p className="mb-2">
        <Link href="/my-account" className={linkBtn}>
          &larr; Sign-in methods
        </Link>
      </p>
      <h1>Set a password</h1>
      <div className={card}>
        {/* One height for every step — swapping states never jumps. */}
        <div className="flex min-h-[260px] flex-col justify-center">
          {step === 'loading' && (
            <div
              className="flex items-center justify-center"
              role="status"
              aria-label="Checking your account"
            >
              <Spinner className="h-8 w-8" />
            </div>
          )}

          {step === 'blocked' && (
            <div className="text-center">
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {blockedText}
              </p>
              <div className="mt-4">
                <Link href="/my-account/sign-in-methods" className={primaryBtn}>
                  Back to sign-in methods
                </Link>
              </div>
            </div>
          )}

          {step === 'password' && (
            <form onSubmit={(e) => void submit(e)}>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Choose a password for your account. From now on you can sign in with your email
                address and this password — your connected social sign-ins keep working exactly as
                before.
              </p>
              <div className="mt-4">
                <label
                  htmlFor="set-password"
                  className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
                >
                  Password
                </label>
                <div className="mt-2">
                  <AuthInput
                    id="set-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="p-1 text-black/[0.38] transition-colors hover:text-black/60 dark:text-white/[0.38] dark:hover:text-white/60"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOffIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    }
                  />
                </div>
              </div>
              <div className="mt-5">
                <PrimaryButton type="submit" loading={saving} disabled={password.length < 8}>
                  Set password
                </PrimaryButton>
              </div>
              <p className="mt-3 text-[13px] text-gray-500 dark:text-white/45">
                We&apos;ll email you to confirm that a password was set on your account.
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
