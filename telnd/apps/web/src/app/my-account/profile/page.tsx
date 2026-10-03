'use client';

// Profile (§14.61) — name and avatar presentation, plus read-only rows
// for the identifiers. Email and phone are SIGN-IN material: the API
// refuses to move them from here for portal sessions (IDENTIFIERS_READ_ONLY)
// — they live under Sign-in methods, verified by OTP, so this page links
// there instead of pretending to edit them. Name-only saves never need
// the password re-auth gate.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth';
import { AuthError, AuthInput, Spinner } from '@/components/auth/AuthUI';
import { Row, card, Chip, primaryBtn, quietBtn } from '@/components/account/ui';

type Me = {
  firstName: string;
  lastName: string;
  email: string | null;
  isEmailVerified: boolean;
  phone: string | null;
  isPhoneVerified: boolean;
  avatar: string | null;
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ data: Me }>('/api/users/me');
        if (cancelled) return;
        setMe(res.data);
        setFirstName(res.data.firstName ?? '');
        setLastName(res.data.lastName ?? '');
      } catch (err) {
        if (!cancelled) setError(authErrorMessage(err, 'Your profile could not be loaded. Please try again.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  const dirty =
    me !== null && (trimmedFirst !== (me.firstName ?? '') || trimmedLast !== (me.lastName ?? ''));
  const invalid = trimmedFirst.length === 0 || trimmedLast.length === 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving || invalid || !dirty) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.patch('/api/users/me', { firstName: trimmedFirst, lastName: trimmedLast });
      setMe((prev) => (prev ? { ...prev, firstName: trimmedFirst, lastName: trimmedLast } : prev));
      setNotice('Profile saved.');
    } catch (err) {
      setError(authErrorMessage(err, 'Your profile could not be saved. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>Profile</h1>

      <div className={`mt-4 ${card}`}>
        {loading && (
          <div className="flex min-h-[180px] items-center justify-center" role="status" aria-label="Loading your profile">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {!loading && error && !me && (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-4 text-center">
            <AuthError>{error}</AuthError>
            <button type="button" className={quietBtn} onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}

        {!loading && me && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your name</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Shown across the site — on applications, your public profile, and in your account menu.
            </p>

            <form className="mt-4 space-y-4" onSubmit={(e) => void save(e)}>
              {error && <AuthError>{error}</AuthError>}
              {notice && (
                <div
                  aria-live="polite"
                  className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  {notice}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-white/80">
                    First name
                  </span>
                  <AuthInput
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    maxLength={50}
                    autoComplete="given-name"
                    placeholder="First name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-white/80">
                    Last name
                  </span>
                  <AuthInput
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    maxLength={50}
                    autoComplete="family-name"
                    placeholder="Last name"
                  />
                </label>
              </div>
              <div>
                <button
                  type="submit"
                  className={primaryBtn}
                  disabled={saving || invalid || !dirty}
                  title="Save your profile"
                >
                  {saving && <Spinner className="h-4 w-4" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>

            <div className="mt-6 border-t border-gray-100 pt-2 dark:border-white/10">
              <div className="divide-y divide-gray-100 dark:divide-white/10">
                <Row
                  title="Email"
                  detail={me.email ?? 'Not added yet'}
                  hint="Sign-in identifiers are managed under Sign-in methods, where each one proves itself."
                  aside={
                    <>
                      {me.email && (
                        <Chip tone={me.isEmailVerified ? 'ok' : 'warn'}>
                          {me.isEmailVerified ? 'Verified' : 'Unverified'}
                        </Chip>
                      )}
                      <Link href="/my-account/sign-in-methods" className={quietBtn} title="Manage sign-in methods">
                        Manage
                      </Link>
                    </>
                  }
                />
                <Row
                  title="Phone number"
                  detail={me.phone ?? 'Not added yet'}
                  hint="Also the number SMS codes are sent to."
                  aside={
                    <>
                      {me.phone && (
                        <Chip tone={me.isPhoneVerified ? 'ok' : 'warn'}>
                          {me.isPhoneVerified ? 'Verified' : 'Unverified'}
                        </Chip>
                      )}
                      <Link href="/my-account/sign-in-methods" className={quietBtn} title="Manage sign-in methods">
                        Manage
                      </Link>
                    </>
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
