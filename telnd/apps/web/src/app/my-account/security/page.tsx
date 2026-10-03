'use client';

// Security (§14.61) — everything the admin panel's Security page holds
// for a user, minus the two that are admin-only by the operator's call:
// no Security PIN and no screen lock (login system). Four cards in the
// shared setup-card style:
//
//   1. Password — self-service change (current password proves it; the
//      server revokes other sessions and every trusted device with them).
//   2. Two-factor — status, full enrollment (authenticator app with QR,
//      SMS or email codes), recovery codes shown once with the enable /
//      regenerate response, and disable behind a LIVE factor code. A
//      policy/enforcement lock shows the standing note instead of the
//      controls (the requirement itself is managed in the admin panel —
//      Settings → Security, one switch for user accounts).
//   3. Trusted devices (§14.61) — browsers that answered the 2FA question
//      with "trust this device": each skips the challenge for 30 days,
//      each revocable here. Password change / 2FA off / sign-out-everywhere
//      wipe them server-side.
//   4. Active sessions — every signed-in device, one-by-one revoke or
//      sign out everywhere else (two-click arm, as everywhere).
//
// Destructive actions arm first (Confirm inside 5s), every working
// control spins, icon-only controls carry aria-label + title.

import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth';
import { AuthError, OtpBoxes, Spinner } from '@/components/auth/AuthUI';
import { Row, card, Chip, dangerBtn, primaryBtn, quietBtn } from '@/components/account/ui';
import { useToast } from '@/components/account/Toast';

type Methods = { hasPassword: boolean };

type TwoFa = {
  enabled: boolean;
  method: string | null;
  pendingSetup: boolean;
  phoneMasked: string | null;
  smsAvailable: boolean;
  smsConfigured: boolean;
  emailMasked: string | null;
  emailAvailable: boolean;
  emailConfigured: boolean;
  enforcedByAdmin: boolean;
  policyRequired: boolean;
  canDisable: boolean;
  recoveryCodesRemaining: number;
};

type TrustedDevice = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
};

type SessionRow = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  location: string | null;
  countryCode: string | null;
  isCurrent: boolean;
};

type Setup = { otpauthUri: string; secret: string };

const METHOD_LABELS: Record<string, string> = { totp: 'Authenticator app', sms: 'SMS code', email: 'Email code' };
const EMPTY_BOXES = ['', '', '', '', '', ''];

function agentShort(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null;
  const os = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : null;
  if (browser && os) return `${browser} on ${os}`;
  return browser || os || 'Unknown device';
}

export default function SecurityPage() {
  // ── shared state ──
  const [loading, setLoading] = useState(true);
  // Load failure only — every response to a click rides the toast (§14.67).
  const [loadError, setLoadError] = useState('');
  const { showToast, toastView } = useToast();
  const [methods, setMethods] = useState<Methods | null>(null);
  const [twoFa, setTwoFa] = useState<TwoFa | null>(null);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [armed, setArmed] = useState('');
  const [busy, setBusy] = useState('');
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** First click arms; the confirming click inside 5s runs `action`. */
  function armThen(key: string, action: () => void) {
    if (armed !== key) {
      if (armTimer.current) clearTimeout(armTimer.current);
      setArmed(key);
      armTimer.current = setTimeout(() => setArmed(''), 5000);
      return;
    }
    if (armTimer.current) clearTimeout(armTimer.current);
    setArmed('');
    action();
  }

  const load = useCallback(async () => {
    try {
      const [m, t, d, s] = await Promise.all([
        api.get<{ data: Methods }>('/api/account/methods'),
        api.get<{ data: TwoFa }>('/api/users/me/2fa'),
        api.get<{ data: { trustedDevices: TrustedDevice[] } }>('/api/users/me/trusted-devices'),
        api.get<{ data: { sessions: SessionRow[] } }>('/api/users/me/sessions'),
      ]);
      setMethods(m.data);
      setTwoFa(t.data);
      setDevices(d.data.trustedDevices);
      setSessions(s.data.sessions);
      setLoadError('');
    } catch (err) {
      setLoadError(authErrorMessage(err, 'Your security settings could not be loaded. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (armTimer.current) clearTimeout(armTimer.current);
    };
  }, [load]);

  // ── password card ──
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwBusy) return;
    if (newPw !== confirmPw) {
      showToast('error', 'The new passwords do not match.');
      return;
    }
    if (newPw.length < 8) {
      showToast('error', 'The new password must be at least 8 characters.');
      return;
    }
    setPwBusy(true);
    try {
      await api.post('/api/users/me/change-password', { currentPassword: curPw, newPassword: newPw });
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
      showToast('success', 'Password changed. Other devices were signed out, and trusted devices were cleared.');
      await load();
    } catch (err) {
      showToast('error', authErrorMessage(err, 'Your password could not be changed. Please try again.'));
    } finally {
      setPwBusy(false);
    }
  }

  // ── two-factor card ──
  const [tfPanel, setTfPanel] = useState<null | 'totp' | 'sms' | 'email'>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [boxes, setBoxes] = useState<string[]>(EMPTY_BOXES);
  const [tfBusy, setTfBusy] = useState<'' | 'start' | 'send' | 'enable' | 'codes' | 'disable'>('');
  // Which enroll button is working — each shows its own spinner.
  const [starting, setStarting] = useState<'' | 'totp' | 'sms' | 'email'>('');
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [codesFor, setCodesFor] = useState<'enable' | 'regenerate' | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  async function startEnroll(method: 'totp' | 'sms' | 'email') {
    if (tfBusy) return;
    setTfBusy('start');
    setStarting(method);
    setNewCodes(null);
    setBoxes(EMPTY_BOXES);
    try {
      if (method === 'totp') {
        const res = await api.post<{ data: Setup }>('/api/users/me/2fa/setup', {});
        setSetup(res.data);
      } else {
        setSetup(null);
        const res = await api.post<{ data: { sent: boolean } }>('/api/users/me/2fa/send', { method });
        if (res.data.sent) setResendIn(45);
      }
      setTfPanel(method);
    } catch (err) {
      showToast('error', authErrorMessage(err, 'Two-factor setup could not start. Please try again.'));
    } finally {
      setTfBusy('');
      setStarting('');
    }
  }

  async function resendCode() {
    if (tfBusy || !tfPanel || resendIn > 0) return;
    setTfBusy('send');
    try {
      await api.post('/api/users/me/2fa/send', { method: tfPanel });
      setResendIn(45);
    } catch (err) {
      showToast('error', authErrorMessage(err, 'The code could not be sent. Please try again.'));
    } finally {
      setTfBusy('');
    }
  }

  async function submitEnable() {
    if (!tfPanel || boxes.join('').length !== 6 || tfBusy) return;
    setTfBusy('enable');
    try {
      const res = await api.post<{ data: { recoveryCodes?: string[] } }>('/api/users/me/2fa/enable', {
        method: tfPanel,
        code: boxes.join(''),
      });
      setBoxes(EMPTY_BOXES);
      setTfPanel(null);
      setSetup(null);
      setResendIn(0);
      if (res.data.recoveryCodes?.length) {
        setNewCodes(res.data.recoveryCodes);
        setCodesFor('enable');
      }
      showToast('success', 'Two-factor authentication is on.');
      await load();
    } catch (err) {
      setBoxes(EMPTY_BOXES);
      showToast('error', authErrorMessage(err, 'That code was not accepted. Please try again.'));
    } finally {
      setTfBusy('');
    }
  }

  // Recovery-code rotate / disable both spend a LIVE factor code: TOTP
  // reads the authenticator; SMS and email first need a 'verify' send.
  const [proofPanel, setProofPanel] = useState<null | 'codes' | 'disable'>(null);
  const codeNeedsSend = twoFa?.enabled && (twoFa.method === 'sms' || twoFa.method === 'email');

  function openProof(kind: 'codes' | 'disable') {
    setProofPanel(kind);
    setBoxes(EMPTY_BOXES);
  }

  async function submitProof() {
    if (!proofPanel || boxes.join('').length !== 6 || tfBusy) return;
    setTfBusy(proofPanel === 'codes' ? 'codes' : 'disable');
    try {
      if (proofPanel === 'codes') {
        const res = await api.post<{ data: { recoveryCodes: string[] } }>('/api/users/me/2fa/recovery-codes', {
          code: boxes.join(''),
        });
        setNewCodes(res.data.recoveryCodes);
        setCodesFor('regenerate');
        showToast('success', 'New recovery codes generated — the old ones no longer work.');
      } else {
        await api.post('/api/users/me/2fa/disable', { code: boxes.join('') });
        showToast('success', 'Two-factor authentication is off.');
      }
      setProofPanel(null);
      setBoxes(EMPTY_BOXES);
      await load();
    } catch (err) {
      setBoxes(EMPTY_BOXES);
      showToast('error', authErrorMessage(err, 'That code was not accepted. Please try again.'));
    } finally {
      setTfBusy('');
    }
  }

  async function sendVerifyCode() {
    if (tfBusy) return;
    setTfBusy('send');
    try {
      await api.post('/api/users/me/2fa/send', {});
      setResendIn(45);
    } catch (err) {
      showToast('error', authErrorMessage(err, 'The code could not be sent. Please try again.'));
    } finally {
      setTfBusy('');
    }
  }

  async function copyCodes() {
    if (!newCodes) return;
    try {
      await navigator.clipboard.writeText(newCodes.join('\n'));
      showToast('success', 'Recovery codes copied to your clipboard.');
    } catch {
      showToast('error', 'Copying failed — select the codes and copy them manually.');
    }
  }

  // ── trusted devices + sessions ──

  async function revokeDevice(id: string) {
    if (busy) return;
    setBusy(`dev:${id}`);
    try {
      await api.delete(`/api/users/me/trusted-devices/${id}`);
      showToast('success', 'Trusted device removed — it will be asked for a code at its next sign-in.');
      await load();
    } catch (err) {
      showToast('error', authErrorMessage(err, 'That device could not be revoked. Please try again.'));
    } finally {
      setBusy('');
    }
  }

  async function revokeSession(id: string) {
    if (busy) return;
    setBusy(`sess:${id}`);
    try {
      await api.delete(`/api/users/me/sessions/${id}`);
      showToast('success', 'Device signed out.');
      await load();
    } catch (err) {
      showToast('error', authErrorMessage(err, 'That session could not be revoked. Please try again.'));
    } finally {
      setBusy('');
    }
  }

  async function signOutEverywhere() {
    if (busy) return;
    setBusy('revokeAll');
    try {
      const res = await api.delete<{ data: { revoked: number } }>('/api/users/me/sessions');
      showToast(
        'success',
        `Signed out ${res.data.revoked} other device${res.data.revoked === 1 ? '' : 's'}. This device stays signed in.`,
      );
      await load();
    } catch (err) {
      showToast('error', authErrorMessage(err, 'Other sessions could not be signed out. Please try again.'));
    } finally {
      setBusy('');
    }
  }

  const tf = twoFa;
  const requiredNote = tf?.enforcedByAdmin
    ? 'Two-factor authentication is required for this account by an administrator and cannot be turned off here.'
    : 'Two-factor authentication is required for all user accounts and cannot be turned off.';

  return (
    <>
      {toastView}
      <h1>Security</h1>

      <div className={`mt-4 ${card}`}>
        {loading && (
          <div className="flex min-h-[200px] items-center justify-center" role="status" aria-label="Loading your security settings">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {!loading && loadError && (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
            <AuthError>{loadError}</AuthError>
            <button
              type="button"
              className={quietBtn}
              onClick={() => {
                setLoading(true);
                void load();
              }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && tf && methods && (
          <>
            {/* ── 1. Password ── */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Password</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Change the password you sign in with. Saving it signs out your other devices.
            </p>
            {methods.hasPassword ? (
              <form className="mt-4 space-y-4" onSubmit={(e) => void changePassword(e)}>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-white/80">Current password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    className="h-10 w-full rounded-[10px] border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#034548] dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:border-[#30A9A2]"
                    value={curPw}
                    onChange={(e) => setCurPw(e.target.value)}
                    required
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-white/80">New password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="h-10 w-full rounded-[10px] border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#034548] dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:border-[#30A9A2]"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      required
                      minLength={8}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-white/80">Repeat new password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="h-10 w-full rounded-[10px] border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors focus:border-[#034548] dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:border-[#30A9A2]"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <div>
                  <button type="submit" className={primaryBtn} disabled={pwBusy} title="Change your password">
                    {pwBusy && <Spinner className="h-4 w-4" />}
                    {pwBusy ? 'Saving…' : 'Change password'}
                  </button>
                </div>
              </form>
            ) : (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                This account does not sign in with a password yet —{' '}
                <a href="/my-account/sign-in-methods" className="font-medium text-[#034548] underline dark:text-[#30A9A2]">
                  add an email address
                </a>{' '}
                to choose one.
              </p>
            )}

            {/* ── 2. Two-factor ── */}
            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Two-factor authentication</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    A second check at sign-in: a code from your app, your phone, or your mailbox.
                  </p>
                </div>
                <Chip tone={tf.enabled ? 'ok' : 'warn'}>
                  {tf.enabled ? 'On' : tf.policyRequired || tf.enforcedByAdmin ? 'Required' : 'Off'}
                </Chip>
              </div>

              {!tf.enabled && (
                <>
                  {tf.pendingSetup && (
                    <p className="mt-3 text-[13px] text-amber-700 dark:text-amber-300">
                      An unfinished setup is on file — start again below and the new code replaces it.
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={quietBtn}
                      onClick={() => void startEnroll('totp')}
                      disabled={tfBusy !== ''}
                      title="Set up an authenticator app"
                    >
                      {starting === 'totp' ? <Spinner className="h-4 w-4" /> : null}
                      Authenticator app
                    </button>
                    {tf.smsAvailable && tf.smsConfigured && (
                      <button
                        type="button"
                        className={quietBtn}
                        onClick={() => void startEnroll('sms')}
                        disabled={tfBusy !== ''}
                        title="Use codes sent by SMS"
                      >
                        {starting === 'sms' ? <Spinner className="h-4 w-4" /> : null}
                        SMS code
                      </button>
                    )}
                    {tf.emailAvailable && tf.emailConfigured && (
                      <button
                        type="button"
                        className={quietBtn}
                        onClick={() => void startEnroll('email')}
                        disabled={tfBusy !== ''}
                        title="Use codes sent by email"
                      >
                        {starting === 'email' ? <Spinner className="h-4 w-4" /> : null}
                        Email code
                      </button>
                    )}
                  </div>
                  {!(tf.smsAvailable && tf.smsConfigured) && !(tf.emailAvailable && tf.emailConfigured) && (
                    <p className="mt-2 text-[13px] text-gray-500 dark:text-white/45">
                      An authenticator app is the available method here — no SMS or email channel is configured for this account.
                    </p>
                  )}

                  {tfPanel && (
                    <div className="mt-4 rounded-[10px] border border-gray-100 bg-gray-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      {tfPanel === 'totp' && setup && (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Scan with your authenticator app
                          </p>
                          <p className="mt-1 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                            Google Authenticator, Authy, 1Password or similar. Can&apos;t scan? Enter the key by hand.
                          </p>
                          <div className="mt-3 flex flex-wrap items-start gap-4">
                            <span className="inline-block rounded-lg bg-white p-2 shadow-sm dark:bg-white">
                              <QRCodeSVG value={setup.otpauthUri} size={148} marginSize={0} />
                            </span>
                            <div className="min-w-0">
                              <p className="break-all rounded-md bg-white px-2 py-1.5 font-mono text-[12px] text-gray-700 dark:bg-white/10 dark:text-gray-200">
                                {setup.secret}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                      {tfPanel && tfPanel !== 'totp' && (
                        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                          A 6-digit code was sent to {tfPanel === 'sms' ? tf.phoneMasked : tf.emailMasked}.{' '}
                          {resendIn > 0 ? `You can request another in ${resendIn}s.` : 'It may take a moment to arrive.'}
                        </p>
                      )}
                      <div className="mt-4">
                        <p className="mb-2 text-[13px] font-medium text-gray-700 dark:text-white/80">Enter the 6-digit code</p>
                        <OtpBoxes boxes={boxes} setBoxes={setBoxes} disabled={tfBusy !== ''} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={primaryBtn}
                          onClick={() => void submitEnable()}
                          disabled={boxes.join('').length !== 6 || tfBusy !== ''}
                          title="Turn on two-factor authentication"
                        >
                          {tfBusy === 'enable' && <Spinner className="h-4 w-4" />}
                          {tfBusy === 'enable' ? 'Verifying…' : 'Turn on'}
                        </button>
                        {tfPanel !== 'totp' && (
                          <button
                            type="button"
                            className={quietBtn}
                            onClick={() => void resendCode()}
                            disabled={resendIn > 0 || tfBusy !== ''}
                            title="Send the code again"
                          >
                            {tfBusy === 'send' && <Spinner className="h-4 w-4" />}
                            {resendIn > 0 ? `Resend (${resendIn}s)` : 'Resend code'}
                          </button>
                        )}
                        <button
                          type="button"
                          className={quietBtn}
                          onClick={() => {
                            setTfPanel(null);
                            setSetup(null);
                            setBoxes(EMPTY_BOXES);
                            setResendIn(0);
                          }}
                          title="Cancel two-factor setup"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {tf.enabled && (
                <>
                  <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
                    <Row
                      title="Status"
                      detail={`On — ${METHOD_LABELS[tf.method ?? ''] ?? 'second factor'} at sign-in.`}
                      aside={<Chip tone="ok">On</Chip>}
                    />
                    <Row
                      title="Recovery codes"
                      detail={`${tf.recoveryCodesRemaining} unused code${tf.recoveryCodesRemaining === 1 ? '' : 's'} left. Each works once if your method is ever unavailable.`}
                      hint={
                        tf.canDisable
                          ? undefined
                          : requiredNote
                      }
                      aside={
                        tf.canDisable ? (
                          <>
                            <button
                              type="button"
                              className={armed === 'regen' ? dangerBtn : quietBtn}
                              onClick={() => armThen('regen', () => openProof('codes'))}
                              disabled={busy !== ''}
                              title="Generate a fresh set of recovery codes"
                            >
                              {armed === 'regen' ? 'Confirm replace' : 'Regenerate'}
                            </button>
                            <button
                              type="button"
                              className={armed === 'disable' ? dangerBtn : quietBtn}
                              onClick={() => armThen('disable', () => openProof('disable'))}
                              disabled={busy !== ''}
                              title="Turn off two-factor authentication"
                            >
                              {armed === 'disable' ? 'Confirm off' : 'Turn off'}
                            </button>
                          </>
                        ) : undefined
                      }
                    />
                  </div>

                  {/* SMS and email prove with a code they send first; the
                      authenticator method never needs a send. */}
                  {codeNeedsSend && !proofPanel && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={quietBtn}
                        onClick={() => void sendVerifyCode()}
                        disabled={resendIn > 0 || tfBusy !== ''}
                        title="Send a confirmation code to your method"
                      >
                        {tfBusy === 'send' && <Spinner className="h-4 w-4" />}
                        {resendIn > 0 ? `Send code (${resendIn}s)` : 'Send a code'}
                      </button>
                      <span className="self-center text-[13px] text-gray-500 dark:text-white/45">
                        Needed before regenerating recovery codes or turning 2FA off.
                      </span>
                    </div>
                  )}

                  {proofPanel && (
                    <div className="mt-4 rounded-[10px] border border-gray-100 bg-gray-50/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {proofPanel === 'disable' ? 'Confirm to turn two-factor off' : 'Confirm with your code'}
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                        {proofPanel === 'disable'
                          ? 'Enter a live 6-digit code from your second factor.'
                          : codeNeedsSend
                            ? 'Enter the 6-digit code you just had sent.'
                            : 'Enter the current 6-digit code from your authenticator app.'}
                      </p>
                      <div className="mt-3">
                        <OtpBoxes boxes={boxes} setBoxes={setBoxes} disabled={tfBusy !== ''} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={primaryBtn}
                          onClick={() => void submitProof()}
                          disabled={boxes.join('').length !== 6 || tfBusy !== ''}
                          title="Submit the code"
                        >
                          {tfBusy === 'codes' || tfBusy === 'disable' ? <Spinner className="h-4 w-4" /> : null}
                          {proofPanel === 'disable' ? 'Turn off two-factor' : 'Generate codes'}
                        </button>
                        {codeNeedsSend && (
                          <button
                            type="button"
                            className={quietBtn}
                            onClick={() => void sendVerifyCode()}
                            disabled={resendIn > 0 || tfBusy !== ''}
                            title="Send the code again"
                          >
                            {tfBusy === 'send' && <Spinner className="h-4 w-4" />}
                            {resendIn > 0 ? `Resend (${resendIn}s)` : 'Resend code'}
                          </button>
                        )}
                        <button
                          type="button"
                          className={quietBtn}
                          onClick={() => {
                            setProofPanel(null);
                            setBoxes(EMPTY_BOXES);
                          }}
                          title="Cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── One-time recovery codes ── */}
            {newCodes && (
              <div className="mt-6 border-t border-gray-100 pt-6 dark:border-white/10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Save your recovery codes</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  Each works once if your second factor is ever unavailable. This is the only time they are shown —
                  store them somewhere safe.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {newCodes.map((code) => (
                    <span
                      key={code}
                      className="rounded-md bg-gray-50 px-2 py-1.5 text-center font-mono text-[13px] tracking-wider text-gray-800 dark:bg-white/10 dark:text-gray-100"
                    >
                      {code}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={quietBtn}
                    onClick={() => void copyCodes()}
                    title="Copy all recovery codes"
                  >
                    Copy all
                  </button>
                  <button
                    type="button"
                    className={primaryBtn}
                    onClick={() => {
                      setNewCodes(null);
                      setCodesFor(null);
                    }}
                    title="I have saved my recovery codes"
                  >
                    {codesFor ? `I saved them (${newCodes.length})` : 'Done'}
                  </button>
                </div>
              </div>
            )}

            {/* ── 3. Trusted devices ── */}
            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-white/10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Trusted devices</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Browsers you told to skip the two-factor question — each trust lasts 30 days or until you remove it
                (changing your password clears them all).
              </p>
              <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
                {devices.length === 0 && (
                  <p className="py-4 text-sm text-gray-600 dark:text-gray-400">
                    No trusted devices — every sign-in asks for your second factor.
                  </p>
                )}
                {devices.map((device) => (
                  <Row
                    key={device.id}
                    title={device.label}
                    detail={`Trusted ${new Date(device.createdAt).toLocaleDateString()} · last used ${new Date(device.lastUsedAt).toLocaleDateString()}`}
                    aside={
                      <>
                        {device.isCurrent ? (
                          <Chip tone="ok">This device</Chip>
                        ) : (
                          <button
                            type="button"
                            className={armed === `dev:${device.id}` ? dangerBtn : quietBtn}
                            onClick={() => armThen(`dev:${device.id}`, () => void revokeDevice(device.id))}
                            disabled={busy !== ''}
                            title="Remove this trusted device"
                          >
                            {busy === `dev:${device.id}` ? <Spinner className="h-4 w-4" /> : null}
                            {armed === `dev:${device.id}` ? 'Confirm' : 'Remove'}
                          </button>
                        )}
                      </>
                    }
                  />
                ))}
              </div>
            </div>

            {/* ── 4. Active sessions ── */}
            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active sessions</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    Every device currently signed in to your account.
                  </p>
                </div>
                <button
                  type="button"
                  className={armed === 'revokeAll' ? dangerBtn : quietBtn}
                  onClick={() => armThen('revokeAll', () => void signOutEverywhere())}
                  disabled={busy !== '' || sessions.filter((s) => !s.isCurrent).length === 0}
                  title="Sign out of every other device"
                >
                  {busy === 'revokeAll' ? <Spinner className="h-4 w-4" /> : null}
                  {armed === 'revokeAll' ? 'Confirm sign out' : 'Sign out everywhere else'}
                </button>
              </div>
              <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
                {sessions.map((session) => (
                  <Row
                    key={session.id}
                    title={[session.location, session.userAgent ? agentShort(session.userAgent) : null].filter(Boolean).join(' · ') || 'Unknown device'}
                    detail={`${session.ipAddress ?? 'Unknown IP'} · signed in ${new Date(session.createdAt).toLocaleString()}`}
                    aside={
                      <>
                        {session.isCurrent ? (
                          <Chip tone="ok">This device</Chip>
                        ) : (
                          <button
                            type="button"
                            className={armed === `sess:${session.id}` ? dangerBtn : quietBtn}
                            onClick={() => armThen(`sess:${session.id}`, () => void revokeSession(session.id))}
                            disabled={busy !== ''}
                            title="Sign this device out"
                          >
                            {busy === `sess:${session.id}` ? <Spinner className="h-4 w-4" /> : null}
                            {armed === `sess:${session.id}` ? 'Confirm' : 'Sign out'}
                          </button>
                        )}
                      </>
                    }
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
