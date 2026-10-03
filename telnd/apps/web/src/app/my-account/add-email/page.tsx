'use client';

// Add or CHANGE an email address (§14.53, change round §14.64) — same
// verify-before-attach shape for both: /start answers uniformly (the
// mailbox's owner is only revealed after the OTP proves it), the code is
// purpose-bound to this door alone, and the write re-checks uniqueness.
// ?change=1 (from the panel, only while a slot is filled) flips the round:
// the code still goes to the NEW address, but it MOVES a slot instead of
// filling one, there is no password step to run (nothing here creates a
// credential), and the swap mails a notice to the old address itself.
// The add round keeps its extra rule on the LAST step: an account without
// a password (social signups) must choose one here — no skip — because
// that email is about to become a sign-in door. Visiting the change URL
// with an empty slot degrades to the honest add round on entry; a slot
// that empties mid-flow gets the server's own verdict inline. Lives under
// /my-account: /auth/* would bounce a signed-in visitor out of the whole
// flow.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { authErrorCode, authErrorMessage, EMAIL_PATTERN, useCountdown } from '@/lib/auth';
import { AuthInput, OtpBoxes, PrimaryButton, Spinner } from '@/components/auth/AuthUI';
import { EyeIcon, EyeOffIcon } from '@/components/auth/icons';
import { useToast } from '@/components/account/Toast';

/** The server's OTP resend gap, mirrored locally for the countdown. */
const RESEND_SECONDS = 45;

type Step = 'loading' | 'email' | 'code' | 'password' | 'blocked';

const card =
  'mt-4 max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5';
const quietBtn =
  'inline-flex h-9 items-center gap-2 rounded-[10px] border border-gray-200 px-3.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-60 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5';
const primaryBtn =
  'inline-flex h-9 items-center rounded-[10px] bg-[#034548] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#025C5F] dark:bg-[#30A9A2] dark:text-[#0D0D0D] dark:hover:bg-[#37bdb6]';
const linkBtn =
  'text-[13px] font-medium text-[#034548] hover:underline dark:text-[#30A9A2]';

export default function AddEmailPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [email, setEmail] = useState('');
  const [changing, setChanging] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [boxes, setBoxes] = useState<string[]>(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useCountdown(0);
  const { showToast, toastView } = useToast();

  const address = email.trim();
  const clearBoxes = () => setBoxes(['', '', '', '', '', '']);

  // Gate on entry: a filled slot belongs to the summary in the ADD
  // round (blocked) and to the form in the CHANGE round (?change=1); a
  // change URL over an empty slot has nothing to move, so it degrades to
  // the add round right here. A failed probe just opens the add form;
  // the /start routes re-check server-side either way.
  useEffect(() => {
    const changeMode = new URLSearchParams(window.location.search).get('change') === '1';
    api
      .get<{ data: { email: string | null; hasPassword: boolean } }>('/api/account/methods')
      .then((res) => {
        setHasPassword(!!res.data?.hasPassword);
        const filled = !!res.data?.email;
        if (changeMode && filled) setChanging(true);
        setStep(filled && !changeMode ? 'blocked' : 'email');
      })
      .catch(() => setStep('email'));
  }, []);

  // Step 1 → 2: send the code — to the mailbox that will BECOME the
  // address (add) or the one that already IS it (change). Uniform answer
  // by design either way; a taken address only says so after the OTP.
  async function start(e?: FormEvent) {
    e?.preventDefault();
    if (sending || !EMAIL_PATTERN.test(address)) return;
    setSending(true);
    try {
      await api.post(changing ? '/api/account/email/change/start' : '/api/account/email/start', { email: address });
      clearBoxes();
      setResendSeconds(RESEND_SECONDS);
      setStep('code');
    } catch (err) {
      if (authErrorCode(err) === 'EMAIL_ALREADY_SET') {
        setStep('blocked');
      } else {
        showToast('error', authErrorMessage(err, 'The code could not be sent. Please try again.'));
      }
    } finally {
      setSending(false);
    }
  }

  async function resend() {
    if (sending || resendSeconds > 0) return;
    setSending(true);
    try {
      await api.post(changing ? '/api/account/email/change/start' : '/api/account/email/start', { email: address });
      clearBoxes();
      setResendSeconds(RESEND_SECONDS);
    } catch (err) {
      showToast('error', authErrorMessage(err, 'A new code could not be sent. Please try again.'));
    } finally {
      setSending(false);
    }
  }

  // Last step: spend the code, move (or attach) the address — and, when
  // ADDING to an account that had no password, the one chosen on the
  // step before. The API demands that password BEFORE spending (its
  // refusal keeps the code live), so a round-trip through this screen
  // never burns a code. The change round never carries a password: it
  // moves a slot, it creates no credential.
  async function verify(value?: string) {
    const entered = value ?? boxes.join('');
    if (entered.length !== 6 || verifying) return;
    setVerifying(true);
    try {
      await api.post(changing ? '/api/account/email/change/verify' : '/api/account/email/verify', {
        email: address,
        code: entered,
        ...(changing || hasPassword ? {} : { password }),
      });
      router.replace(
        changing
          ? '/my-account/sign-in-methods?changed=email'
          : '/my-account/sign-in-methods?added=email',
      );
    } catch (err) {
      const code = authErrorCode(err);
      if (code === 'OTP_INVALID' || code === 'OTP_TOO_MANY_ATTEMPTS') {
        // Back to the boxes: the code is gone, a fresh one is the fix.
        clearBoxes();
        setStep('code');
        showToast('error', authErrorMessage(err, 'That code is invalid or has expired. Please try again.'));
      } else if (code === 'EMAIL_ALREADY_SET') {
        setStep('blocked');
      } else if (code === 'PASSWORD_REQUIRED') {
        // The UI already knew — only reachable if the account changed
        // underneath; route there rather than dead-end on the error.
        setStep('password');
        showToast('error', authErrorMessage(err, 'Choose a password to finish adding your email.'));
      } else {
        showToast(
          'error',
          authErrorMessage(
            err,
            changing
              ? 'The address could not be changed. Please try again.'
              : 'The address could not be added. Please try again.',
          ),
        );
      }
      setVerifying(false);
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
      <h1>{changing ? 'Change your email address' : 'Add an email address'}</h1>
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
                This account already has an email address.
              </p>
              <div className="mt-4">
                <Link href="/my-account" className={primaryBtn}>
                  Back to sign-in methods
                </Link>
              </div>
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={(e) => void start(e)}>
              <label
                htmlFor="add-email"
                className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
              >
                Email address
              </label>
              <div className="mt-2">
                <AuthInput
                  id="add-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-gray-500 dark:text-white/45">
                {changing
                  ? "We'll email a 6-digit code to confirm it's yours. Once confirmed, the new address replaces your current one — the old address is notified."
                  : "We'll email a 6-digit code to confirm it's yours. Once added, the address can also sign you in."}
              </p>
              <div className="mt-5">
                <PrimaryButton type="submit" loading={sending} disabled={!EMAIL_PATTERN.test(address)}>
                  Send code
                </PrimaryButton>
              </div>
            </form>
          )}

          {step === 'code' && (
            <div>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Enter the 6-digit code we sent to{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{address}</span>.
              </p>
              <div className="mt-5">
                <OtpBoxes
                  boxes={boxes}
                  setBoxes={setBoxes}
                  onComplete={(value) => {
                    // Proof in hand: the change round and accounts that
                    // already have a password finish right here; the
                    // rest route through the password step first (no
                    // skip).
                    if (changing || hasPassword) void verify(value);
                    else {
                      setStep('password');
                    }
                  }}
                  disabled={verifying}
                />
              </div>
              {verifying ? (
                <p
                  className="mt-4 flex items-center gap-2 text-[13px] text-gray-500 dark:text-white/45"
                  role="status"
                >
                  <Spinner className="h-4 w-4" /> Verifying the code&hellip;
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    className={quietBtn}
                    onClick={() => void resend()}
                    disabled={sending || resendSeconds > 0}
                  >
                    {sending && <Spinner className="h-4 w-4" />}
                    {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    className={linkBtn}
                    onClick={() => {
                      setStep('email');
                      clearBoxes();
                    }}
                  >
                    Change address
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'password' && (
            <div>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Choose a password for your account. From now on you&apos;ll sign in with{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{address}</span> and
                this password.
              </p>
              <div className="mt-4">
                <label
                  htmlFor="add-email-password"
                  className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
                >
                  Password
                </label>
                <div className="mt-2">
                  <AuthInput
                    id="add-email-password"
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
                <PrimaryButton
                  onClick={() => void verify()}
                  loading={verifying}
                  disabled={password.length < 8}
                >
                  Verify and add email
                </PrimaryButton>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[13px] text-gray-500 dark:text-white/45">
                  Your code still counts — no need to request a new one.
                </p>
                <button
                  type="button"
                  className={linkBtn}
                  onClick={() => {
                    setStep('code');
                  }}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
