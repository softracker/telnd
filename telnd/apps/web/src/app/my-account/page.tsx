'use client';

// Overview — My Account's front page (§14.61): two summary cards in the
// shared setup-card style, pointing into the section that manages each
// thing. The sign-in methods content moved to its own section; a legacy
// /my-account?added=… link (old wizard landing) is forwarded there so
// the notice still shows where the method is listed.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth';
import { AuthError, Spinner } from '@/components/auth/AuthUI';
import { Row, card, Chip, quietBtn } from '@/components/account/ui';

type Methods = {
  email: string | null;
  isEmailVerified: boolean;
  phone: string | null;
  isPhoneVerified: boolean;
  hasPassword: boolean;
  identities: { provider: string; createdAt: string; lastLoginAt: string | null }[];
};
type Me = { firstName: string; lastName: string; avatar: string | null };
type TwoFa = { enabled: boolean; method: string | null; policyRequired: boolean };

const METHOD_LABELS: Record<string, string> = { totp: 'Authenticator app', sms: 'SMS code', email: 'Email code' };

function CardHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function MyAccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [methods, setMethods] = useState<Methods | null>(null);
  const [twoFa, setTwoFa] = useState<TwoFa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Legacy landing: /my-account?added=… used to announce the finished
    // add wizard — forward it to where that notice now lives.
    const added = new URLSearchParams(window.location.search).get('added');
    if (added) {
      router.replace(`/my-account/sign-in-methods?added=${encodeURIComponent(added)}`);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [m, s, t] = await Promise.all([
          api.get<{ data: Me }>('/api/users/me'),
          api.get<{ data: Methods }>('/api/account/methods'),
          api.get<{ data: TwoFa }>('/api/users/me/2fa'),
        ]);
        if (cancelled) return;
        setMe(m.data);
        setMethods(s.data);
        setTwoFa(t.data);
      } catch (err) {
        if (!cancelled) setError(authErrorMessage(err, 'Your account could not be loaded. Please try again.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const displayName = me ? `${me.firstName} ${me.lastName}`.trim() : '';
  const connectedCount = methods?.identities.length ?? 0;

  return (
    <>
      <h1>My Account</h1>

      <div className={`mt-4 ${card}`}>
        {loading && (
          <div className="flex min-h-[180px] items-center justify-center" role="status" aria-label="Loading your account">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {!loading && error && (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-4 text-center">
            <AuthError>{error}</AuthError>
            <button
              type="button"
              className={quietBtn}
              onClick={() => {
                setError('');
                setLoading(true);
                window.location.reload();
              }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && me && methods && twoFa && (
          <>
            <CardHead title="Profile">
              <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Who you are across the whole site.
              </p>
            </CardHead>

            <div className="mt-4 flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#034548] text-base font-semibold text-white dark:bg-[#30A9A2] dark:text-[#0D0D0D]">
                {me.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  (displayName[0]?.toUpperCase() || 'A')
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{displayName || 'Your profile'}</p>
                <p className="truncate text-sm text-gray-600 dark:text-gray-400">{methods.email ?? 'No email added'}</p>
              </div>
            </div>

            <div className="mt-2 divide-y divide-gray-100 dark:divide-white/10">
              <Row
                title="Phone number"
                detail={methods.phone ?? 'Not added yet'}
                aside={
                  <Link href="/my-account/profile" className={quietBtn} title="Edit your profile">
                    Edit profile
                  </Link>
                }
              />
              <Row
                title="Sign-in methods"
                detail={`${connectedCount} connected account${connectedCount === 1 ? '' : 's'} · email, phone, password`}
                aside={
                  <Link href="/my-account/sign-in-methods" className={quietBtn} title="Manage sign-in methods">
                    Manage
                  </Link>
                }
              />
            </div>

            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-white/10">
              <CardHead title="Security">
                <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  Your password, second factor, and active devices.
                </p>
              </CardHead>
              <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
                <Row
                  title="Password"
                  detail={methods.hasPassword ? 'Set on this account.' : 'Not set — you sign in without one.'}
                  aside={<Chip tone={methods.hasPassword ? 'ok' : 'warn'}>{methods.hasPassword ? 'Set' : 'None'}</Chip>}
                />
                <Row
                  title="Two-factor authentication"
                  detail={
                    twoFa.enabled
                      ? `On — ${METHOD_LABELS[twoFa.method ?? ''] ?? 'second factor'} at sign-in.`
                      : twoFa.policyRequired
                        ? 'Required for your account — finish setup at next sign-in.'
                        : 'Off — your account signs in with a single factor.'
                  }
                  aside={
                    <Chip tone={twoFa.enabled ? 'ok' : twoFa.policyRequired ? 'warn' : 'warn'}>
                      {twoFa.enabled ? 'On' : twoFa.policyRequired ? 'Required' : 'Off'}
                    </Chip>
                  }
                />
                <Row
                  title="Trusted devices & sessions"
                  detail="Manage where you are signed in and which browsers skip the 2FA question."
                  aside={
                    <Link href="/my-account/security" className={quietBtn} title="Open Security">
                      Open Security
                    </Link>
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
