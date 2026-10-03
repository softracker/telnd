'use client';

// Add or CHANGE a phone number (§14.53, change round §14.64) — the only
// way a number reaches an account now that the signup wizard stopped
// taking one. Verify-before-attach in both rounds: /start answers
// identically no matter who already owns the number (no account oracle),
// and the "someone else's number" verdict can only land AFTER the code
// proves the handset. ?change=1 (from the panel, while a slot is filled)
// flips the round: the code goes to the NEW number, the slot MOVES
// instead of filling, and the swap mails a masked notice to the account's
// email (the old handset hears nothing about itself). Visiting the change
// URL with an empty slot degrades to the honest add round on entry. The
// code is purpose-bound to this door — it can never open a sign-in, and
// a login code can never open this door. Lives under /my-account on
// purpose: /auth/* is guarded against signed-in visitors and would
// bounce this whole flow out.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { authErrorCode, authErrorMessage, useCountdown } from '@/lib/auth';
import { AuthError, AuthInput, OtpBoxes, PrimaryButton, Spinner } from '@/components/auth/AuthUI';

/** The only country line live — same fixed chip the signup screens use. */
const COUNTRY_CODE = '+880';
/** The server's OTP resend gap, mirrored locally for the countdown. */
const RESEND_SECONDS = 45;

type Step = 'loading' | 'number' | 'code' | 'blocked';

const card =
  'mt-4 max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5';
const quietBtn =
  'inline-flex h-9 items-center gap-2 rounded-[10px] border border-gray-200 px-3.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-60 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5';
const primaryBtn =
  'inline-flex h-9 items-center rounded-[10px] bg-[#034548] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#025C5F] dark:bg-[#30A9A2] dark:text-[#0D0D0D] dark:hover:bg-[#37bdb6]';
const linkBtn =
  'text-[13px] font-medium text-[#034548] hover:underline dark:text-[#30A9A2]';

export default function AddPhonePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('loading');
  const [changing, setChanging] = useState(false);
  const [digits, setDigits] = useState('');
  const [boxes, setBoxes] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendSeconds, setResendSeconds] = useCountdown(0);

  const fullPhone = `${COUNTRY_CODE}${digits}`;
  const clearBoxes = () => setBoxes(['', '', '', '', '', '']);

  // Gate on entry: a filled slot belongs to the summary in the ADD
  // round (blocked) and to the form in the CHANGE round (?change=1); a
  // change URL over an empty slot has nothing to move, so it degrades to
  // the add round right here. A failed probe just opens the form; the
  // /start routes re-check the slot server-side anyway.
  useEffect(() => {
    const changeMode = new URLSearchParams(window.location.search).get('change') === '1';
    api
      .get<{ data: { phone: string | null } }>('/api/account/methods')
      .then((res) => {
        const filled = !!res.data?.phone;
        if (changeMode && filled) setChanging(true);
        setStep(filled && !changeMode ? 'blocked' : 'number');
      })
      .catch(() => setStep('number'));
  }, []);

  // Step 1 → 2: send the code — to the handset that will BECOME the
  // number (add) or the one that already IS it (change). Uniform answer
  // by design either way — a taken number only says so after the OTP.
  async function start(e?: FormEvent) {
    e?.preventDefault();
    if (sending || digits.length !== 10) return;
    setError('');
    setSending(true);
    try {
      await api.post(changing ? '/api/account/phone/change/start' : '/api/account/phone/start', { phone: fullPhone });
      clearBoxes();
      setResendSeconds(RESEND_SECONDS);
      setStep('code');
    } catch (err) {
      if (authErrorCode(err) === 'PHONE_ALREADY_SET') {
        setStep('blocked');
      } else {
        setError(authErrorMessage(err, 'The code could not be sent. Please try again.'));
      }
    } finally {
      setSending(false);
    }
  }

  async function resend() {
    if (sending || resendSeconds > 0) return;
    setError('');
    setSending(true);
    try {
      await api.post(changing ? '/api/account/phone/change/start' : '/api/account/phone/start', { phone: fullPhone });
      clearBoxes();
      setResendSeconds(RESEND_SECONDS);
    } catch (err) {
      setError(authErrorMessage(err, 'A new code could not be sent. Please try again.'));
    } finally {
      setSending(false);
    }
  }

  // Step 2 → done: spend the code, move (or attach) the number, land
  // back on the summary with the success notice.
  async function verify(value?: string) {
    const entered = value ?? boxes.join('');
    if (entered.length !== 6 || verifying) return;
    setError('');
    setVerifying(true);
    try {
      await api.post(changing ? '/api/account/phone/change/verify' : '/api/account/phone/verify', {
        phone: fullPhone,
        code: entered,
      });
      router.replace(
        changing
          ? '/my-account/sign-in-methods?changed=phone'
          : '/my-account/sign-in-methods?added=phone',
      );
    } catch (err) {
      const code = authErrorCode(err);
      if (code === 'OTP_INVALID' || code === 'OTP_TOO_MANY_ATTEMPTS') {
        clearBoxes();
        setError(authErrorMessage(err, 'That code is invalid or has expired. Please try again.'));
      } else if (code === 'PHONE_ALREADY_SET') {
        setStep('blocked');
      } else if (code === 'PHONE_IN_USE') {
        // The code is spent and the number belongs elsewhere — hand back
        // the verdict with a fresh send (or a different number) to fix it.
        clearBoxes();
        setError(authErrorMessage(err, 'That phone number is already on another account.'));
      } else {
        setError(
          authErrorMessage(
            err,
            changing
              ? 'The number could not be changed. Please try again.'
              : 'The number could not be added. Please try again.',
          ),
        );
      }
      setVerifying(false);
    }
  }

  return (
    <>
      <p className="mb-2">
        <Link href="/my-account" className={linkBtn}>
          &larr; Sign-in methods
        </Link>
      </p>
      <h1>{changing ? 'Change your phone number' : 'Add a phone number'}</h1>
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
                This account already has a phone number.
              </p>
              <div className="mt-4">
                <Link href="/my-account" className={primaryBtn}>
                  Back to sign-in methods
                </Link>
              </div>
            </div>
          )}

          {step === 'number' && (
            <form onSubmit={(e) => void start(e)}>
              <label
                htmlFor="add-phone"
                className="block text-[13px] font-medium text-[#1F2937] dark:text-white/70"
              >
                Phone number
              </label>
              <div className="mt-2 flex items-stretch gap-3">
                <div className="flex h-[52px] shrink-0 items-center rounded-[14px] bg-[#F1F5F9] px-3.5 text-[15px] font-medium text-[#1F2937] dark:bg-white/5 dark:text-white">
                  {COUNTRY_CODE}
                </div>
                <div className="min-w-0 flex-1">
                  <AuthInput
                    id="add-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="1XXXXXXXXX"
                    maxLength={10}
                    value={digits}
                    onChange={(e) =>
                      setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10))
                    }
                  />
                </div>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-gray-500 dark:text-white/45">
                {changing
                  ? "We'll text a 6-digit code to confirm it's yours. Once confirmed, the new number replaces your current one — your account's email is notified."
                  : "We'll text a 6-digit code to confirm it's yours. Once added, the number can also sign you in."}
              </p>
              {error && (
                <div className="mt-4">
                  <AuthError>{error}</AuthError>
                </div>
              )}
              <div className="mt-5">
                <PrimaryButton type="submit" loading={sending} disabled={digits.length !== 10}>
                  Send code
                </PrimaryButton>
              </div>
            </form>
          )}

          {step === 'code' && (
            <div>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Enter the 6-digit code we sent to{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{fullPhone}</span>.
              </p>
              <div className="mt-5">
                <OtpBoxes
                  boxes={boxes}
                  setBoxes={setBoxes}
                  onComplete={(value) => void verify(value)}
                  disabled={verifying}
                />
              </div>
              {error && (
                <div className="mt-4">
                  <AuthError>{error}</AuthError>
                </div>
              )}
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
                      setStep('number');
                      setError('');
                      clearBoxes();
                    }}
                  >
                    Change number
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
