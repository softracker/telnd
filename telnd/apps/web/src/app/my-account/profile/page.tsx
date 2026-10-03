'use client';

// Profile (§14.61) — name and avatar editing, plus read-only rows
// for the identifiers. Email and phone are SIGN-IN material: the API
// refuses to move them from here for portal sessions (IDENTIFIERS_READ_ONLY)
// — they live under Sign-in methods, verified by OTP, so this page links
// there instead of pretending to edit them. Name-only saves never need
// the password re-auth gate.
//
// The photo (§14.66) uploads straight through POST /api/account/avatar —
// the admin panel's exact rails (512² WebP → R2 avatars/); replace lands
// immediately, Remove arms first (house two-click) and clears the object
// server-side. Both ends refresh the header's copy of the picture through
// refreshSession(), so the shell can't keep showing a photo that's gone.
// A pick that isn't already square stops at the crop dialog first: its
// round selection IS the frame the avatar becomes, so the circle preview
// and the stored result can never disagree.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { authErrorMessage, refreshSession } from '@/lib/auth';
import { AuthError, AuthInput, Spinner } from '@/components/auth/AuthUI';
import { Row, card, Chip, primaryBtn, quietBtn, dangerBtn } from '@/components/account/ui';
import PhotoCropper, { loadImageSize } from '@/components/account/PhotoCropper';

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
  // Photo round (§14.66): '' idle, 'upload' while the file is in flight,
  // 'remove' from the armed Confirm tap until the DELETE answers. Remove
  // arms first (house two-click) and the arm retracts on its own after 5s.
  const [photoBusy, setPhotoBusy] = useState<'' | 'upload' | 'remove'>('');
  const [photoArmed, setPhotoArmed] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoNotice, setPhotoNotice] = useState('');
  // Open crop dialog (§14.66): a non-square pick becomes an object URL
  // held here until the dialog closes (or the page unmounts).
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoArmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (photoArmTimer.current) clearTimeout(photoArmTimer.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

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

  async function uploadPhoto(file: Blob, filename: string): Promise<boolean> {
    setPhotoBusy('upload');
    setPhotoError('');
    setPhotoNotice('');
    try {
      const form = new FormData();
      form.append('file', file, filename);
      const res = await api.upload<{ data: { avatar: string } }>('/api/account/avatar', form);
      setMe((prev) => (prev ? { ...prev, avatar: res.data.avatar } : prev));
      setPhotoNotice('Profile photo updated.');
      refreshSession();
      return true;
    } catch (err) {
      setPhotoError(authErrorMessage(err, 'Your photo could not be uploaded. Please try again.'));
      return false;
    } finally {
      setPhotoBusy('');
    }
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Cleared on the way out so the same file can be re-picked after a
    // failure — a value the browser considers "unchanged" never re-fires.
    e.target.value = '';
    if (!file || photoBusy) return;
    setPhotoError('');
    setPhotoNotice('');

    // Already square → straight through (§14.66). Anything else earns one
    // crop turn: the dialog's circle is exactly the frame the avatar
    // becomes, so the preview and the result can never disagree.
    const url = URL.createObjectURL(file);
    let size: { width: number; height: number } | null = null;
    try {
      size = await loadImageSize(url);
    } catch {
      size = null;
    }
    if (!size) {
      URL.revokeObjectURL(url);
      setPhotoError('That image could not be read. Please choose another file.');
      return;
    }
    if (size.width === size.height) {
      URL.revokeObjectURL(url);
      await uploadPhoto(file, file.name);
      return;
    }
    setCropSrc(url); // revoked when the dialog closes
  }

  function closeCropper() {
    if (photoBusy) return; // the approved upload is still in flight
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function confirmCropper(blob: Blob) {
    const ok = await uploadPhoto(blob, blob.type === 'image/webp' ? 'photo.webp' : 'photo.png');
    // Success swaps the picture — close and show the page's notice.
    // A failure keeps the dialog up (the error renders inside it) so the
    // crop survives the retry instead of forcing a re-pick.
    if (ok) closeCropper();
  }

  async function removePhoto() {
    if (photoBusy) return;
    if (!photoArmed) {
      setPhotoArmed(true);
      setPhotoError('');
      setPhotoNotice('');
      if (photoArmTimer.current) clearTimeout(photoArmTimer.current);
      photoArmTimer.current = setTimeout(() => setPhotoArmed(false), 5000);
      return;
    }
    if (photoArmTimer.current) clearTimeout(photoArmTimer.current);
    setPhotoArmed(false);
    setPhotoBusy('remove');
    setPhotoError('');
    setPhotoNotice('');
    try {
      await api.delete('/api/account/avatar');
      setMe((prev) => (prev ? { ...prev, avatar: null } : prev));
      setPhotoNotice('Profile photo removed.');
      refreshSession();
    } catch (err) {
      setPhotoError(authErrorMessage(err, 'Your photo could not be removed. Please try again.'));
    } finally {
      setPhotoBusy('');
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile photo</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Shown wherever your name appears — on applications, your public profile, and in your account menu.
            </p>

            {photoError && (
              <div className="mt-3">
                <AuthError>{photoError}</AuthError>
              </div>
            )}
            {photoNotice && (
              <div
                aria-live="polite"
                className="mt-3 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                {photoNotice}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#034548] text-xl font-semibold text-white dark:bg-[#30A9A2] dark:text-[#0D0D0D]"
                aria-hidden="true"
              >
                {me.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  (firstName.trim()[0]?.toUpperCase() || 'A')
                )}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={quietBtn}
                  onClick={() => photoInputRef.current?.click()}
                  disabled={!!photoBusy}
                  title="Change your profile photo"
                >
                  {photoBusy === 'upload' && <Spinner className="h-4 w-4" />}
                  {photoBusy === 'upload' ? 'Uploading…' : 'Change photo'}
                </button>
                {me.avatar && (
                  <button
                    type="button"
                    className={photoArmed ? dangerBtn : quietBtn}
                    onClick={() => void removePhoto()}
                    disabled={!!photoBusy}
                    title="Remove your profile photo"
                  >
                    {photoBusy === 'remove' && <Spinner className="h-4 w-4" />}
                    {photoArmed ? 'Confirm remove' : 'Remove'}
                  </button>
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={!!photoBusy}
                  onChange={(e) => void handlePhotoFile(e)}
                />
              </div>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-6 dark:border-white/10">
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
            </div>

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

      {cropSrc && (
        <PhotoCropper
          src={cropSrc}
          busy={photoBusy === 'upload'}
          error={photoError}
          onCancel={closeCropper}
          onConfirm={confirmCropper}
        />
      )}
    </>
  );
}
