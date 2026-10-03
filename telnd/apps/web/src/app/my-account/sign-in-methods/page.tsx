'use client';

// Sign-in methods (§14.53, promoted to its own section §14.61) — every
// identifier that can open a session on this account, whether it is
// proven, and the door to ADD a missing one. A number or address only
// ever arrives OTP-verified (the signup wizard stopped taking a phone
// number this round), and the add wizards live under /my-account — never
// under /auth, whose auth guard bounces signed-in visitors straight back
// out again. The wizards land back HERE with ?added=… so the notice
// appears where the new method is actually listed.
//
// Password is a state row, not a flow: wizard-born accounts keep the
// password they chose at signup; social-only accounts choose theirs
// inside the add-email attach (the API demands it there — no skip), and
// §14.64 adds the third door — a Set password button for an account that
// has an email but no hash yet (the login round is email+password, so a
// slotless address offers nothing to pair it with). The identifier rows
// gained a Change button too: the same OTP wizards, parameterized by
// ?change=1, moving a filled slot instead of filling an empty one — the
// new address/number proves itself, the old destination gets the notice,
// and the panel announces both endings (?changed=…, ?added=password)
// exactly like the adds (?added=…).
// Connected accounts are removable with the standing two-click arm →
// Confirm, and the API refuses the removal that would close the last
// door (LAST_SIGNIN_METHOD), so the button can never strand anyone.
// Connect navigates natively to the API's start URL on purpose — that
// route 302s to the provider, which only a real browser navigation can
// follow. The click arms an inline spinner that rides the whole hop out
// (same-tab clicks only — a modifier-click opens a tab and returns
// here). The link carries ?mode=connect (§14.63): that is a CONNECT,
// not a sign-in — the identity binds to this session whatever email the
// provider reports, no session is ever opened or switched, and the flow
// lands back HERE with ?connected=… on success or ?error=… on refusal,
// each announced once and dropped from the URL.

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth';
import { AuthError, Spinner } from '@/components/auth/AuthUI';
import { Notice, Row, card, Chip, primaryBtn, quietBtn, dangerBtn } from '@/components/account/ui';

type Methods = {
  email: string | null;
  isEmailVerified: boolean;
  phone: string | null;
  isPhoneVerified: boolean;
  hasPassword: boolean;
  identities: { provider: string; createdAt: string; lastLoginAt: string | null }[];
};

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};
const CONNECTABLE = ['google', 'facebook', 'linkedin'];

export default function SignInMethodsPage() {
  const [methods, setMethods] = useState<Methods | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [armed, setArmed] = useState('');
  const [busy, setBusy] = useState('');
  const [connecting, setConnecting] = useState('');
  const [removeError, setRemoveError] = useState('');
  const [connectError, setConnectError] = useState('');
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [m, p] = await Promise.all([
        api.get<{ data: Methods }>('/api/account/methods'),
        // Best-effort: if the flags fetch dies, keep the methods list up
        // and simply show no Connect rows (fail closed — better a missing
        // row than a Connect link that404s).
        api
          .get<{ data: Record<string, boolean> }>('/api/auth/providers')
          .catch(() => ({ data: {} as Record<string, boolean> })),
      ]);
      setMethods(m.data);
      setFlags(p.data ?? {});
    } catch (err) {
      setMethods(null);
      setError(authErrorMessage(err, 'Your sign-in methods could not be loaded. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // ?added=phone|email|password and ?changed=email|phone arrive from
    // a finished wizard — announce once, then drop the query so a
    // refresh doesn't repeat the claim. ?connected=… / ?error=… are the
    // connect flow's two endings (§14.63) — same announce-once treatment.
    const q = new URLSearchParams(window.location.search);
    const added = q.get('added');
    const changed = q.get('changed');
    const connected = q.get('connected');
    const failed = q.get('error');
    if (added === 'phone') setNotice('Phone number added — it now signs you in.');
    else if (added === 'email') setNotice('Email address added — it now signs you in.');
    else if (added === 'password') setNotice('Password set — you can now sign in with your email and password.');
    if (changed === 'email') setNotice('Email address changed — the old one was notified.');
    else if (changed === 'phone') setNotice('Phone number changed — your email was notified.');
    if (connected) {
      const label = PROVIDER_LABELS[connected] ?? connected;
      setNotice(`${label} is now connected — it can sign you in.`);
    }
    if (failed) setConnectError(failed);
    if (added || changed || connected || failed) {
      window.history.replaceState(null, '', '/my-account/sign-in-methods');
    }
    void load();
    return () => {
      if (armTimer.current) clearTimeout(armTimer.current);
    };
  }, [load]);

  /** First click arms the Remove button; the click inside 5s confirms. */
  function armRemoval(provider: string) {
    if (armTimer.current) clearTimeout(armTimer.current);
    setArmed(provider);
    setRemoveError('');
    armTimer.current = setTimeout(() => setArmed(''), 5000);
  }

  async function removeIdentity(provider: string) {
    if (armed !== provider) {
      armRemoval(provider);
      return;
    }
    if (busy) return;
    if (armTimer.current) clearTimeout(armTimer.current);
    setBusy(provider);
    setRemoveError('');
    try {
      await api.post('/api/auth/oauth/unlink', { provider });
      setArmed('');
      setNotice(`${PROVIDER_LABELS[provider] ?? provider} is no longer connected.`);
      await load();
    } catch (err) {
      setArmed('');
      setRemoveError(
        authErrorMessage(err, `${PROVIDER_LABELS[provider] ?? provider} could not be removed. Please try again.`),
      );
    } finally {
      setBusy('');
    }
  }

  const identities = methods?.identities ?? [];
  const connectedProviders = new Set(identities.map((i) => i.provider));
  const connectable = CONNECTABLE.filter((p) => flags[p] && !connectedProviders.has(p));

  return (
    <>
      <h1>Sign-in methods</h1>
      {notice && <Notice>{notice}</Notice>}
      <div className={`mt-4 ${card}`}>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          How you get into your account. A new method only counts once a code sent to it proves it.
        </p>

        {loading && (
          <div
            className="flex min-h-[260px] items-center justify-center"
            role="status"
            aria-label="Loading your sign-in methods"
          >
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {!loading && error && (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
            <AuthError>{error}</AuthError>
            <button type="button" className={quietBtn} onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && methods && (
          <>
            <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
              <Row
                title="Email"
                detail={methods.email ?? 'Not added yet'}
                hint={
                  methods.email && !methods.isEmailVerified
                    ? 'This address has not been verified yet.'
                    : undefined
                }
                aside={
                  methods.email ? (
                    <>
                      <Chip tone={methods.isEmailVerified ? 'ok' : 'warn'}>
                        {methods.isEmailVerified ? 'Verified' : 'Unverified'}
                      </Chip>
                      <Link
                        href="/my-account/add-email?change=1"
                        className={quietBtn}
                        title="Change email address"
                      >
                        Change
                      </Link>
                    </>
                  ) : (
                    <Link href="/my-account/add-email" className={primaryBtn} title="Add an email address">
                      Add email
                    </Link>
                  )
                }
              />
              <Row
                title="Phone number"
                detail={methods.phone ?? 'Not added yet'}
                hint={
                  methods.phone && !methods.isPhoneVerified
                    ? 'This number has not been verified yet.'
                    : undefined
                }
                aside={
                  methods.phone ? (
                    <>
                      <Chip tone={methods.isPhoneVerified ? 'ok' : 'warn'}>
                        {methods.isPhoneVerified ? 'Verified' : 'Unverified'}
                      </Chip>
                      <Link
                        href="/my-account/add-phone?change=1"
                        className={quietBtn}
                        title="Change phone number"
                      >
                        Change
                      </Link>
                    </>
                  ) : (
                    <Link href="/my-account/add-phone" className={primaryBtn} title="Add a phone number">
                      Add phone
                    </Link>
                  )
                }
              />
              <Row
                title="Password"
                detail={methods.hasPassword ? 'Set — you can sign in with it.' : 'Not set yet.'}
                hint={
                  methods.hasPassword
                    ? undefined
                    : methods.email
                      ? 'Set one to also sign in with your email address and password.'
                      : "You'll choose one when you add your email."
                }
                aside={
                  methods.hasPassword ? (
                    <Chip tone="ok">Set</Chip>
                  ) : methods.email ? (
                    <Link href="/my-account/set-password" className={quietBtn} title="Set a password">
                      Set password
                    </Link>
                  ) : undefined
                }
              />
            </div>

            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-white/10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected accounts</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Sign in with a social account. Removing one asks twice, and never closes your last door.
              </p>
              {removeError && (
                <div className="mt-3">
                  <AuthError>{removeError}</AuthError>
                </div>
              )}
              {connectError && (
                <div className="mt-3">
                  <AuthError>{connectError}</AuthError>
                </div>
              )}
              <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
                {identities.map((identity) => {
                  const label = PROVIDER_LABELS[identity.provider] ?? identity.provider;
                  const isArmed = armed === identity.provider;
                  return (
                    <Row
                      key={identity.provider}
                      title={label}
                      detail={
                        identity.lastLoginAt
                          ? `Connected — last used ${new Date(identity.lastLoginAt).toLocaleDateString()}`
                          : 'Connected'
                      }
                      aside={
                        <button
                          type="button"
                          className={isArmed ? dangerBtn : quietBtn}
                          onClick={() => void removeIdentity(identity.provider)}
                          disabled={!!busy}
                          title={`Remove ${label} sign-in`}
                        >
                          {busy === identity.provider && <Spinner className="h-4 w-4" />}
                          {isArmed ? 'Confirm remove' : 'Remove'}
                        </button>
                      }
                    />
                  );
                })}
                {connectable.map((provider) => (
                  <Row
                    key={provider}
                    title={PROVIDER_LABELS[provider] ?? provider}
                    detail="Not connected"
                    aside={
                      <a
                        href={`/api/auth/oauth/${provider}/start?mode=connect`}
                        className={quietBtn}
                        title={`Connect ${PROVIDER_LABELS[provider] ?? provider}`}
                        onClick={(e) => {
                          // Modifier/middle clicks open a TAB and come
                          // straight back here — arming a spinner for a
                          // navigation that never leaves would strand it.
                          // Same-tab clicks arm it for the whole native
                          // hop out (API 302 → provider) and unmount with
                          // the page.
                          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                          setConnecting(provider);
                        }}
                      >
                        {connecting === provider && <Spinner className="h-4 w-4" />}
                        {connecting === provider ? 'Connecting…' : 'Connect'}
                      </a>
                    }
                  />
                ))}
                {identities.length === 0 && connectable.length === 0 && (
                  <p className="py-4 text-sm text-gray-600 dark:text-gray-400">
                    No accounts are connected right now.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
