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
// inside the add-email attach (the API demands it there — no skip).
// Connected accounts are removable with the standing two-click arm →
// Confirm, and the API refuses the removal that would close the last
// door (LAST_SIGNIN_METHOD), so the button can never strand anyone.
// Connect navigates natively to the API's start URL on purpose — that
// route 302s to the provider, which only a real browser navigation can
// follow.

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
  const [removeError, setRemoveError] = useState('');
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
    // ?added=phone|email arrives from a finished wizard — announce it
    // once, then drop the query so a refresh doesn't repeat the claim.
    const added = new URLSearchParams(window.location.search).get('added');
    if (added === 'phone') setNotice('Phone number added — it now signs you in.');
    else if (added === 'email') setNotice('Email address added — it now signs you in.');
    if (added) window.history.replaceState(null, '', '/my-account/sign-in-methods');
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
                    <Chip tone={methods.isEmailVerified ? 'ok' : 'warn'}>
                      {methods.isEmailVerified ? 'Verified' : 'Unverified'}
                    </Chip>
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
                    <Chip tone={methods.isPhoneVerified ? 'ok' : 'warn'}>
                      {methods.isPhoneVerified ? 'Verified' : 'Unverified'}
                    </Chip>
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
                      ? 'You sign in through a connected account — no password yet.'
                      : "You'll choose one when you add your email."
                }
                aside={methods.hasPassword ? <Chip tone="ok">Set</Chip> : undefined}
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
                        href={`/api/auth/oauth/${provider}/start`}
                        className={quietBtn}
                        title={`Connect ${PROVIDER_LABELS[provider] ?? provider}`}
                      >
                        Connect
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
