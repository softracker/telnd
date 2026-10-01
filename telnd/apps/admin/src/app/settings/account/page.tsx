'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import { useAuth } from '@/lib/auth-context';
import Toast, { type ToastType } from '@/components/toast';
import ImageUploader from '@/components/image-uploader';
import RoleBadge from '@/components/role-badge';
import { EditIcon, DeleteIcon, ConfirmIcon, RefreshIcon, ShieldIcon, ShieldOffIcon, LockIcon, KeyIcon } from '@/components/action-icons';
import { ListPager } from '@/components/list-pager';
import { Dropdown } from '@/components/dropdown';

interface AdminAccount {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  isSelf: boolean;
  // 2FA state — drives the row badge and the super-admin require toggle.
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
  twoFactorRequired: boolean;
  // Security PIN state (§14.44) — reset action + require toggle.
  securityPinSet: boolean;
  securityPinRequired: boolean;
}

interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  permissions: unknown;
  isSystem: boolean;
}

interface AdminFormState {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
  roleId: string;
}

interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      style={{ animation: 'spin 0.7s linear infinite' }}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.8" />
    </svg>
  );
}

// Section-heading style shared by the Add/Edit admin modal groups.
const groupLabelStyle = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--muted-text)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 0.625rem',
};

// Instruction callout above the create form — mirrors the settings
// instruction boxes: where the credentials for a new admin come from.
const inviteNoteStyle = {
  backgroundColor: 'var(--accent-light)',
  border: '1px solid var(--accent)',
  borderRadius: '10px',
  padding: '0.75rem 1rem',
  marginBottom: '1.25rem',
  fontSize: '0.8125rem',
  color: 'var(--accent)',
  lineHeight: 1.6,
};

export default function TeamAccountSettingsPage() {
  const { t } = useLanguage();
  const { user, can, refreshUser, isFullAccess, roleName } = useAuth();

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);
  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  // ── My account ──
  // Compact by default: picture, name, email, edit. The pencil expands this
  // card into the full editor — photo upload, name, and email.
  const [profile, setProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
    // Phone — where SMS 2FA codes are delivered (empty = no number).
    phone: string;
  }>({ firstName: '', lastName: '', email: '', avatar: null, phone: '' });
  const [profileEditing, setProfileEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  // True while the photo is in flight — Save and Enter stay inert until it
  // lands, so the profile is never persisted mid-upload.
  const [profileUploading, setProfileUploading] = useState(false);

  // Raised when the server refuses to move the sign-in email or phone
  // without a fresh password (#6): the form then reveals a
  // current-password field and the retry carries it.
  const [reauthNeeded, setReauthNeeded] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');

  // Last persisted photo. Tells a fresh upload (pending — must be swept if
  // the edit is abandoned) apart from the saved one (survives until replaced).
  const savedAvatarRef = useRef<string | null>(null);
  const sessionUploadsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        avatar: user.avatar ?? null,
        phone: user.phone || '',
      });
      savedAvatarRef.current = user.avatar ?? null;
    }
  }, [user]);

  const deleteImage = useCallback((url: string) => {
    // Best-effort: a rare storage leak beats blocking the UI on cleanup.
    api.delete('/api/upload/image', { url }).catch(() => {});
  }, []);

  // Photos uploaded this visit that never got saved — sweep them when the
  // page unmounts (same idea as the Our Team photo tracking).
  useEffect(() => {
    const pending = sessionUploadsRef.current;
    return () => {
      for (const url of pending) api.deleteKeepalive('/api/upload/image', { url });
    };
  }, []);

  function handleAvatarUpload(url: string) {
    const current = profile.avatar;
    // Replacing an upload that was never saved — drop the orphan right away.
    if (current && current !== url && sessionUploadsRef.current.has(current)) {
      sessionUploadsRef.current.delete(current);
      deleteImage(current);
    }
    sessionUploadsRef.current.add(url);
    setProfile((p) => ({ ...p, avatar: url }));
  }

  function handleAvatarRemove() {
    const current = profile.avatar;
    // Only a never-saved upload is deleted immediately; the saved photo stays
    // until the removal is actually persisted (Cancel restores it untouched).
    if (current && sessionUploadsRef.current.has(current)) {
      sessionUploadsRef.current.delete(current);
      deleteImage(current);
    }
    setProfile((p) => ({ ...p, avatar: null }));
  }

  function cancelProfileEdit() {
    const current = profile.avatar;
    if (current && sessionUploadsRef.current.has(current)) {
      sessionUploadsRef.current.delete(current);
      deleteImage(current);
    }
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        avatar: user.avatar ?? null,
        phone: user.phone || '',
      });
    }
    setProfileEditing(false);
    setReauthNeeded(false);
    setReauthPassword('');
  }

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    if (profileUploading) return;
    setSavingProfile(true);
    try {
      await api.patch('/api/users/me', {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        avatar: profile.avatar,
        // Empty input clears the number (the API treats "" as null).
        phone: profile.phone.trim(),
        // Present only after the server has asked for it: moving the
        // sign-in email or phone re-proves the account password (#6).
        ...(reauthPassword ? { currentPassword: reauthPassword } : {}),
      });
      // Photo lifecycle on success: the new upload graduates from pending; a
      // replaced or cleared saved photo is now unreferenced — remove it.
      const next = profile.avatar;
      const previous = savedAvatarRef.current;
      if (next) sessionUploadsRef.current.delete(next);
      if (previous && previous !== next) deleteImage(previous);
      savedAvatarRef.current = next ?? null;
      await refreshUser();
      showToast('success', t('account.profileSaved'));
      setProfileEditing(false);
      setReauthNeeded(false);
      setReauthPassword('');
    } catch (err) {
      const code =
        err instanceof ApiError
          ? (err.data as { error?: { code?: string } | null } | null)?.error?.code
          : undefined;
      if (code === 'REAUTH_REQUIRED') {
        // The identifiers moved — reveal the password field for the retry
        // and drop any wrong attempt so a fresh one is typed.
        setReauthNeeded(true);
        setReauthPassword('');
      }
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Admin accounts ──
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [adminForm, setAdminForm] = useState<AdminFormState | null>(null);
  const [savingAdmin, setSavingAdmin] = useState(false);
  // Armed after a failed submit; the inline error then clears itself the
  // moment the two addresses match.
  const [emailErrorArmed, setEmailErrorArmed] = useState(false);
  // Armed when Create is submitted without a role — nothing is pre-selected
  // on the create form; the message clears itself once a role is picked.
  const [roleErrorArmed, setRoleErrorArmed] = useState(false);
  const [pendingDeleteAdmin, setPendingDeleteAdmin] = useState<string | null>(null);
  // Two-click confirm for suspend/activate — suspend revokes every session and
  // logs the target out, so a stray click must not fire it.
  const [pendingSuspendAdmin, setPendingSuspendAdmin] = useState<string | null>(null);
  // Two-click confirm + in-flight spinner for the password-regenerate action.
  const [pendingRegenAdmin, setPendingRegenAdmin] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Roles feed both the filter dropdown and the add/edit modal select —
  // tolerate missing roles.view (the selects just come up empty).
  const loadRoles = useCallback(async () => {
    try {
      const res = await api.get<AdminRole[]>('/api/admin/roles');
      setRoles(res || []);
    } catch (err) {
      setRoles([]);
      if (err instanceof ApiError && err.status !== 403) {
        showToast('error', err.message);
      }
    } finally {
      setLoadingAdmins(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (can('admins.view')) void loadRoles();
    else setLoadingAdmins(false);
  }, [can, loadRoles]);

  // Server-side search + role filter + pagination for the admin list
  // (DataTables-style, 5 rows a page) — mirrors the Our Team card.
  const [adminSearchInput, setAdminSearchInput] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminRoleFilter, setAdminRoleFilter] = useState('');
  const [adminPage, setAdminPage] = useState(1);
  const [adminRows, setAdminRows] = useState<AdminAccount[]>([]);
  const [adminMeta, setAdminMeta] = useState({ page: 1, totalPages: 1, filteredTotal: 0, total: 0 });
  const [adminRowsLoading, setAdminRowsLoading] = useState(true);

  // Debounce the search box; a new query always restarts at page 1.
  useEffect(() => {
    const id = setTimeout(() => {
      setAdminSearch(adminSearchInput.trim());
      setAdminPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [adminSearchInput]);

  const loadAdminRows = useCallback(async () => {
    setAdminRowsLoading(true);
    try {
      const res = await api.get<{
        items: AdminAccount[];
        page: number;
        totalPages: number;
        filteredTotal: number;
        total: number;
      }>(
        `/api/admin/admins?search=${encodeURIComponent(adminSearch)}&role=${encodeURIComponent(adminRoleFilter)}&page=${adminPage}&pageSize=5`,
      );
      setAdminRows(res.items || []);
      setAdminMeta({ page: res.page, totalPages: res.totalPages, filteredTotal: res.filteredTotal, total: res.total });
      // The server clamps out-of-range pages — follow it so the pager stays truthful.
      if (res.page !== adminPage) setAdminPage(res.page);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 403) showToast('error', err.message);
    } finally {
      setAdminRowsLoading(false);
    }
  }, [adminSearch, adminRoleFilter, adminPage, showToast]);

  useEffect(() => {
    if (can('admins.view')) void loadAdminRows();
  }, [can, loadAdminRows]);

  function startAddAdmin() {
    setEmailErrorArmed(false);
    setRoleErrorArmed(false);
    setAdminForm({
      firstName: '',
      lastName: '',
      email: '',
      confirmEmail: '',
      // No default role — the picker starts on "Select" and the submit guard
      // demands an explicit choice.
      roleId: '',
    });
  }

  function startEditAdmin(a: AdminAccount) {
    setEmailErrorArmed(false);
    setRoleErrorArmed(false);
    setAdminForm({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email ?? '',
      confirmEmail: a.email ?? '',
      roleId: a.roleId ?? '',
    });
  }

  function closeAdminForm() {
    setAdminForm(null);
  }

  // The admin form renders as a modal — lock body scroll and allow Escape to
  // close it while it's open (same behavior as the Our Team member modal).
  const adminFormOpen = adminForm !== null;
  useEffect(() => {
    if (!adminFormOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAdminForm();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminFormOpen]);

  async function handleAdminSave(e: FormEvent) {
    e.preventDefault();
    if (!adminForm) return;
    // Confirm-email guard (create AND edit): a mistyped address must never
    // gain or replace access — the server enforces the same rule.
    if (adminForm.email.trim() !== adminForm.confirmEmail.trim()) {
      setEmailErrorArmed(true);
      return;
    }
    setEmailErrorArmed(false);
    // Create requires an explicit role pick — the form starts unselected.
    if (!adminForm.id && !adminForm.roleId) {
      setRoleErrorArmed(true);
      return;
    }
    setRoleErrorArmed(false);
    setSavingAdmin(true);
    try {
      const { id, ...raw } = adminForm;
      const rest = { ...raw, email: raw.email.trim(), confirmEmail: raw.confirmEmail.trim() };
      if (id) {
        await api.patch(`/api/admin/admins/${id}`, rest);
        showToast('success', t('account.adminUpdated'));
      } else {
        await api.post('/api/admin/admins', rest);
        showToast('success', t('account.adminCreated', { email: rest.email }));
      }
      setAdminForm(null);
      await loadAdminRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSavingAdmin(false);
    }
  }

  async function handleAdminStatus(a: AdminAccount) {
    // Two-click confirm (mirrors delete/regenerate): the first click only
    // arms the button; the second one actually changes the status.
    if (pendingSuspendAdmin !== a.id) {
      setPendingSuspendAdmin(a.id);
      return;
    }
    setPendingSuspendAdmin(null);
    try {
      if (a.isActive) {
        await api.patch(`/api/admin/users/${a.id}/suspend`, {});
      } else {
        await api.patch(`/api/admin/users/${a.id}/activate`, {});
      }
      await loadAdminRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    }
  }

  async function handleAdminDelete(a: AdminAccount) {
    if (pendingDeleteAdmin !== a.id) {
      setPendingDeleteAdmin(a.id);
      return;
    }
    setPendingDeleteAdmin(null);
    try {
      await api.delete(`/api/admin/admins/${a.id}`);
      showToast('success', t('account.adminDeleted'));
      await loadAdminRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    }
  }

  // Two-click confirm (mirrors delete): regenerate emails the admin a
  // single-use reset link for their own address — no password is generated
  // or stored until the link is used.
  async function handleAdminRegenerate(a: AdminAccount) {
    if (pendingRegenAdmin !== a.id) {
      setPendingRegenAdmin(a.id);
      return;
    }
    setPendingRegenAdmin(null);
    setRegeneratingId(a.id);
    try {
      await api.post(`/api/admin/admins/${a.id}/regenerate-password`, {});
      showToast('success', t('account.passwordRegenerated', { email: a.email ?? '' }));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setRegeneratingId(null);
    }
  }

  // ── Super admin: per-admin two-factor requirement ──
  // Arm (first click shows the confirm icon) → act (second click PATCHes).
  const [pendingTwoFaAdmin, setPendingTwoFaAdmin] = useState<string | null>(null);
  const [twoFaToggleId, setTwoFaToggleId] = useState<string | null>(null);

  async function handleAdminTwoFactor(a: AdminAccount) {
    if (pendingTwoFaAdmin !== a.id) {
      setPendingTwoFaAdmin(a.id);
      return;
    }
    setPendingTwoFaAdmin(null);
    setTwoFaToggleId(a.id);
    const required = !a.twoFactorRequired;
    const name = `${a.firstName} ${a.lastName}`;
    try {
      await api.patch(`/api/admin/admins/${a.id}/two-factor`, { required });
      showToast('success', required ? t('twoFactor.requiredToast', { name }) : t('twoFactor.releasedToast', { name }));
      await loadAdminRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setTwoFaToggleId(null);
    }
  }

  // ── Super admin: turn an enrolled admin's own 2FA off ──
  // The Shield only dials the requirement, so an account that enrolled by
  // itself (on, but never required) had no way to be turned off from this
  // list. Same two-click arm → act pattern; the PATCH's release branch
  // wipes the enrollment outright.
  const [pendingTwoFaOff, setPendingTwoFaOff] = useState<string | null>(null);
  const [twoFaOffId, setTwoFaOffId] = useState<string | null>(null);

  async function handleAdminTwoFaOff(a: AdminAccount) {
    if (pendingTwoFaOff !== a.id) {
      setPendingTwoFaOff(a.id);
      return;
    }
    setPendingTwoFaOff(null);
    setTwoFaOffId(a.id);
    const name = `${a.firstName} ${a.lastName}`;
    try {
      await api.patch(`/api/admin/admins/${a.id}/two-factor`, { required: false });
      showToast('success', t('twoFactor.releasedToast', { name }));
      await loadAdminRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setTwoFaOffId(null);
    }
  }

  // ── Super admin: per-admin security-PIN requirement (§14.44) ──
  // Arm (first click shows the confirm icon) → act (second click PATCHes),
  // same rhythm as the two-factor toggles above.
  const [pendingPinAdmin, setPendingPinAdmin] = useState<string | null>(null);
  const [pinToggleId, setPinToggleId] = useState<string | null>(null);

  async function handleAdminPinRequired(a: AdminAccount) {
    if (pendingPinAdmin !== a.id) {
      setPendingPinAdmin(a.id);
      return;
    }
    setPendingPinAdmin(null);
    setPinToggleId(a.id);
    const name = `${a.firstName} ${a.lastName}`;
    const next = !a.securityPinRequired;
    try {
      await api.patch(`/api/admin/admins/${a.id}/pin-required`, { required: next });
      showToast('success', next ? t('securityPin.requiredToast', { name }) : t('securityPin.releasedToast', { name }));
      await loadAdminRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setPinToggleId(null);
    }
  }

  // ── Permission-enabled admin: reset a PIN nobody can type anymore ──
  // The acting admin approves this action with their OWN PIN (the API's
  // gate never looks at the target's — a forgotten PIN can't approve its
  // own removal). The requirement survives: the target must set a fresh
  // one at its next challenge.
  const [pendingPinReset, setPendingPinReset] = useState<string | null>(null);
  const [pinResetId, setPinResetId] = useState<string | null>(null);

  async function handleAdminPinReset(a: AdminAccount) {
    if (pendingPinReset !== a.id) {
      setPendingPinReset(a.id);
      return;
    }
    setPendingPinReset(null);
    setPinResetId(a.id);
    const name = `${a.firstName} ${a.lastName}`;
    try {
      await api.post(`/api/admin/admins/${a.id}/pin-reset`, {});
      showToast('success', t('securityPin.resetToast', { name }));
      await loadAdminRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setPinResetId(null);
    }
  }

  const pageLoading = loadingAdmins;

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('account.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('account.description')}
      </p>

      {pageLoading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Spinner size={18} />
          </div>
          {t('common.loading')}
        </div>
      )}

      {!pageLoading && (
        <>
          {/* ── My Account ── */}
          <Section title={t('account.myAccount')} description={t('account.myAccountDesc')}>
            {profileEditing ? (
              <form onSubmit={handleProfileSave}>
                <ImageUploader
                  label={t('account.photo')}
                  value={profile.avatar ?? undefined}
                  folder="avatars"
                  maxWidth={512}
                  maxHeight={512}
                  quality={85}
                  onUpload={handleAvatarUpload}
                  onRemove={handleAvatarRemove}
                  onUploadingChange={setProfileUploading}
                />
                {/* Breathing room between the uploader and the name fields. */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <Input
                    label={t('account.firstName')}
                    value={profile.firstName}
                    onChange={(v) => setProfile((p) => ({ ...p, firstName: v }))}
                    required
                  />
                  <Input
                    label={t('account.lastName')}
                    value={profile.lastName}
                    onChange={(v) => setProfile((p) => ({ ...p, lastName: v }))}
                    required
                  />
                </div>
                <Input
                  label={t('account.email')}
                  value={profile.email}
                  onChange={(v) => setProfile((p) => ({ ...p, email: v }))}
                  type="email"
                  required
                />
                {/* Where SMS 2FA codes get delivered — optional, but SMS
                    sign-in codes can't work without it. */}
                <Input
                  label={t('account.phone')}
                  value={profile.phone}
                  onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
                  type="tel"
                  placeholder="01712345678"
                  helperText={t('account.phoneHelp')}
                />
                {/* A moved sign-in email or phone is re-confirmed with the
                    account password (#6) — the server asks by refusing the
                    save, and this field carries the retry. */}
                {reauthNeeded && (
                  <Input
                    label={t('security.currentPassword')}
                    value={reauthPassword}
                    onChange={setReauthPassword}
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={cancelProfileEdit}
                    disabled={savingProfile}
                    style={{
                      background: 'var(--secondary-btn-bg)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      padding: '0.5rem 0.875rem',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <SaveButton saving={savingProfile || profileUploading} label={t('account.saveProfile')} />
                </div>
              </form>
            ) : (
              /* Compact identity card — picture, name, email, edit pencil. */
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar}
                    alt={`${profile.firstName} ${profile.lastName}`}
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'var(--secondary-btn-bg)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      flexShrink: 0,
                    }}
                  >
                    {(profile.firstName || profile.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {profile.firstName} {profile.lastName}
                    </span>
                    {roleName ? (
                      <RoleBadge name={roleName} full={isFullAccess} small />
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>{t('account.noRole')}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.email}
                  </div>
                  {profile.phone && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {profile.phone}
                    </div>
                  )}
                </div>
                <RowAction ariaLabel={t('common.edit')} onClick={() => setProfileEditing(true)}>
                  <EditIcon />
                </RowAction>
              </div>
            )}
          </Section>

          {/* ── Admin Accounts ── */}
          {can('admins.view') && (
            <Section title={t('account.admins')} description={t('account.adminsDesc')}>
              {/* Toolbar: server-side search + role filter + Add Admin —
                  same layout as the Our Team card. */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{ position: 'relative', flex: '1 1 auto', maxWidth: '260px' }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--muted-text)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      value={adminSearchInput}
                      onChange={(e) => setAdminSearchInput(e.target.value)}
                      placeholder={t('account.searchAdmins')}
                      aria-label={t('account.searchAdmins')}
                      style={{
                        width: '100%',
                        height: '36px',
                        padding: '0 0.75rem 0 2rem',
                        borderRadius: '8px',
                        border: '1px solid var(--input-border)',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-main)',
                        fontSize: '0.8125rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <Dropdown
                    value={adminRoleFilter}
                    onChange={(v) => {
                      setAdminRoleFilter(v);
                      setAdminPage(1);
                    }}
                    options={[{ value: '', label: t('account.allRoles') }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
                    ariaLabel={t('account.role')}
                    style={{ width: '180px' }}
                    height={36}
                  />
                </div>
                {can('admins.create') && (
                  <button
                    type="button"
                    onClick={startAddAdmin}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      background: 'var(--accent)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.5rem 0.875rem',
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    {t('account.addAdmin')}
                  </button>
                )}
              </div>

              {/* Row list — same view as the Our Team members (no table). */}
              {adminRows.map((a, index) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 0',
                    borderTop: index === 0 ? 'none' : '1px solid var(--border-color)',
                    opacity: adminRowsLoading ? 0.6 : 1,
                  }}
                >
                  {a.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.avatar}
                      alt={`${a.firstName} ${a.lastName}`}
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--secondary-btn-bg)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        flexShrink: 0,
                      }}
                    >
                      {(a.firstName || a.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {a.firstName} {a.lastName}
                      </span>
                      {a.roleName ? (
                        <RoleBadge name={a.roleName} full={a.permissions.includes('*')} small />
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>{t('account.noRole')}</span>
                      )}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.1875rem 0.5rem',
                          borderRadius: '999px',
                          background: a.isActive ? 'var(--success-bg)' : 'var(--error-bg)',
                          color: a.isActive ? 'var(--success-text)' : 'var(--error-text)',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: a.isActive ? 'var(--success-text)' : 'var(--error-text)',
                          }}
                        />
                        {a.isActive ? t('account.active') : t('account.suspended')}
                      </span>
                      {/* 2FA state: green when on, accent when a super admin
                          demands setup at the account's next sign-in. */}
                      {(a.twoFactorEnabled || a.twoFactorRequired) && (
                        <span
                          title={a.twoFactorEnabled ? t('twoFactor.badgeOn') : t('twoFactor.badgeRequired')}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.1875rem 0.5rem',
                            borderRadius: '999px',
                            background: a.twoFactorEnabled ? 'var(--success-bg)' : 'var(--accent-light)',
                            color: a.twoFactorEnabled ? 'var(--success-text)' : 'var(--accent)',
                          }}
                        >
                          {a.twoFactorEnabled ? t('twoFactor.badgeOn') : t('twoFactor.badgeRequired')}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>{a.email}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    {can('admins.edit') && !a.isSelf && (
                      <RowAction ariaLabel={t('common.edit')} onClick={() => startEditAdmin(a)}>
                        <EditIcon />
                      </RowAction>
                    )}
                    {isFullAccess && (
                      <RowAction
                        ariaLabel={pendingRegenAdmin === a.id ? t('account.confirmRegenerate') : t('account.regenerate')}
                        onClick={() => handleAdminRegenerate(a)}
                        disabled={regeneratingId === a.id}
                        style={pendingRegenAdmin === a.id ? { background: 'var(--accent-light)' } : undefined}
                      >
                        {regeneratingId === a.id ? (
                          <Spinner size={13} />
                        ) : pendingRegenAdmin === a.id ? (
                          <ConfirmIcon />
                        ) : (
                          <RefreshIcon />
                        )}
                      </RowAction>
                    )}
                    {/* Super admin only: require / release 2FA for this
                        admin (two-click arm, like the other row actions). */}
                    {isFullAccess && (
                      <RowAction
                        ariaLabel={
                          pendingTwoFaAdmin === a.id
                            ? t('account.confirmStatus')
                            : a.twoFactorRequired
                              ? t('twoFactor.rowRelease')
                              : t('twoFactor.rowRequire')
                        }
                        onClick={() => handleAdminTwoFactor(a)}
                        disabled={twoFaToggleId === a.id}
                        style={pendingTwoFaAdmin === a.id ? { background: 'var(--accent-light)' } : undefined}
                      >
                        {twoFaToggleId === a.id ? (
                          <Spinner size={13} />
                        ) : pendingTwoFaAdmin === a.id ? (
                          <ConfirmIcon />
                        ) : (
                          <ShieldIcon />
                        )}
                      </RowAction>
                    )}
                    {/* Super admin only: turn off an account that enrolled
                        by itself — visible only while it is on WITHOUT a
                        requirement (otherwise the Shield's release is the
                        turn-off). Two-click arm → act. */}
                    {isFullAccess && a.twoFactorEnabled && !a.twoFactorRequired && (
                      <RowAction
                        ariaLabel={
                          pendingTwoFaOff === a.id
                            ? t('account.confirmStatus')
                            : t('twoFactor.rowDisable')
                        }
                        onClick={() => handleAdminTwoFaOff(a)}
                        disabled={twoFaOffId === a.id}
                        style={pendingTwoFaOff === a.id ? { background: 'var(--accent-light)' } : undefined}
                      >
                        {twoFaOffId === a.id ? (
                          <Spinner size={13} />
                        ) : pendingTwoFaOff === a.id ? (
                          <ConfirmIcon />
                        ) : (
                          <ShieldOffIcon />
                        )}
                      </RowAction>
                    )}
                    {/* Super admin only: demand (or release) this admin's
                        security PIN — two-click arm → act, like the 2FA
                        shield above. Demanding provisions nothing; the
                        account must set one at its next PIN challenge. */}
                    {isFullAccess && (
                      <RowAction
                        ariaLabel={
                          pendingPinAdmin === a.id
                            ? t('account.confirmStatus')
                            : a.securityPinRequired
                              ? t('securityPin.rowRelease')
                              : t('securityPin.rowRequire')
                        }
                        onClick={() => handleAdminPinRequired(a)}
                        disabled={pinToggleId === a.id}
                        style={pendingPinAdmin === a.id ? { background: 'var(--accent-light)' } : undefined}
                      >
                        {pinToggleId === a.id ? (
                          <Spinner size={13} />
                        ) : pendingPinAdmin === a.id ? (
                          <ConfirmIcon />
                        ) : (
                          <LockIcon />
                        )}
                      </RowAction>
                    )}
                    {/* Permission-enabled admin (admins.edit): clear a PIN
                        nobody can type anymore — shown only while one is
                        on file. The acting admin approves with their own
                        PIN at the API gate. Two-click arm → act. */}
                    {can('admins.edit') && a.securityPinSet && !a.isSelf && (
                      <RowAction
                        ariaLabel={
                          pendingPinReset === a.id
                            ? t('account.confirmStatus')
                            : t('securityPin.rowReset')
                        }
                        onClick={() => handleAdminPinReset(a)}
                        disabled={pinResetId === a.id}
                        style={pendingPinReset === a.id ? { background: 'var(--accent-light)' } : undefined}
                      >
                        {pinResetId === a.id ? (
                          <Spinner size={13} />
                        ) : pendingPinReset === a.id ? (
                          <ConfirmIcon />
                        ) : (
                          <KeyIcon />
                        )}
                      </RowAction>
                    )}
                    {(can('users.edit') || can('admins.edit')) && !a.isSelf && (
                      <RowAction
                        ariaLabel={
                          pendingSuspendAdmin === a.id
                            ? t('account.confirmStatus')
                            : a.isActive
                              ? t('account.suspend')
                              : t('account.activate')
                        }
                        onClick={() => handleAdminStatus(a)}
                        style={pendingSuspendAdmin === a.id ? { background: 'var(--accent-light)' } : undefined}
                      >
                        {pendingSuspendAdmin === a.id
                          ? t('account.confirmStatus')
                          : a.isActive
                            ? t('account.suspend')
                            : t('account.activate')}
                      </RowAction>
                    )}
                    {can('admins.delete') && !a.isSelf && (
                      <RowAction
                        danger
                        ariaLabel={pendingDeleteAdmin === a.id ? t('account.confirmDelete') : t('common.delete')}
                        onClick={() => handleAdminDelete(a)}
                        style={pendingDeleteAdmin === a.id ? { background: 'rgba(239, 68, 68, 0.12)' } : undefined}
                      >
                        {pendingDeleteAdmin === a.id ? <ConfirmIcon /> : <DeleteIcon />}
                      </RowAction>
                    )}
                  </div>
                </div>
              ))}

              {adminRowsLoading && (
                <div role="status" style={{ display: 'flex', justifyContent: 'center', padding: '0.625rem 0' }}>
                  <Spinner size={16} />
                </div>
              )}

              {adminRows.length === 0 && !adminRowsLoading && (
                <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)', padding: '0.75rem 0' }}>
                  {adminSearch || adminRoleFilter ? t('common.noResults') : t('account.noAdmins')}
                </p>
              )}

              <ListPager
                page={adminMeta.page}
                totalPages={adminMeta.totalPages}
                filteredTotal={adminMeta.filteredTotal}
                loading={adminRowsLoading}
                onPageChange={setAdminPage}
              />

              {/* Add / edit modal — mirrors the Our Team member modal. */}
              {adminForm && (
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      width: '100%',
                      maxWidth: '560px',
                      maxHeight: '90vh',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      boxShadow: '0 16px 48px rgba(0, 0, 0, 0.28)',
                    }}
                  >
                    {/* Header — pinned with a divider below; only the body scrolls. */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.125rem 1.5rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                      <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                        {adminForm.id ? t('account.editAdmin') : t('account.addAdmin')}
                      </h4>
                      <button
                        type="button"
                        onClick={closeAdminForm}
                        aria-label={t('common.cancel')}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0.25rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--muted-text)',
                          cursor: 'pointer',
                          borderRadius: '6px',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    <form onSubmit={handleAdminSave} style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Body — the scrollable region between the dividers. */}
                      <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
                        {/* Create mode: explain where the credentials come from. */}
                        {!adminForm.id && (
                          <div style={inviteNoteStyle}>{t('account.inviteNote')}</div>
                        )}

                        {/* Section — Details */}
                        <p style={groupLabelStyle}>{t('account.groupDetails')}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Input
                          label={t('account.firstName')}
                          value={adminForm.firstName}
                          onChange={(v) => setAdminForm((f) => f && { ...f, firstName: v })}
                          required
                        />
                        <Input
                          label={t('account.lastName')}
                          value={adminForm.lastName}
                          onChange={(v) => setAdminForm((f) => f && { ...f, lastName: v })}
                          required
                        />
                        <Input
                          label={t('account.email')}
                          value={adminForm.email}
                          onChange={(v) => setAdminForm((f) => f && { ...f, email: v })}
                          type="email"
                          required
                          helperText={adminForm.id ? undefined : t('account.emailHelp')}
                        />
                        <Input
                          label={t('account.confirmEmail')}
                          value={adminForm.confirmEmail}
                          onChange={(v) => setAdminForm((f) => f && { ...f, confirmEmail: v })}
                          type="email"
                          required
                          error={
                            emailErrorArmed && adminForm.email.trim() !== adminForm.confirmEmail.trim()
                              ? t('account.emailMismatch')
                              : undefined
                          }
                        />
                      </div>

                      {/* Section — Access */}
                      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                        <p style={groupLabelStyle}>{t('account.groupAccess')}</p>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                          {t('account.role')} <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>
                        </label>
                        <Dropdown
                          value={adminForm.roleId}
                          onChange={(v) => setAdminForm((f) => f && { ...f, roleId: v })}
                          options={roles.map((r) => ({ value: r.id, label: r.name }))}
                          placeholder={t('common.select')}
                          ariaLabel={t('account.role')}
                          disabled={adminForm.id === user?.id}
                          height={40}
                        />
                        {roleErrorArmed && !adminForm.roleId && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--error-text)', margin: '0.375rem 0 0' }}>
                            {t('account.roleRequired')}
                          </p>
                        )}
                      </div>
                      </div>
                      {/* Footer — pinned with a divider above it. */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={closeAdminForm}
                          style={{
                            background: 'var(--secondary-btn-bg)',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border-color)',
                            padding: '0.5rem 0.875rem',
                            borderRadius: '8px',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {t('common.cancel')}
                        </button>
                        <SaveButton saving={savingAdmin} label={adminForm.id ? t('common.save') : t('account.createAdmin')} />
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </Section>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }\n.row-icon-btn:hover { background: var(--accent-light); }`}</style>
      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast((prev) => (prev && prev.id === toast.id ? null : prev))}
        />
      )}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1rem',
      }}
    >
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{description}</p>
      )}
      {!description && <div style={{ marginBottom: '0.75rem' }} />}
      {children}
    </div>
  );
}

function SaveButton({ saving, label, onClick }: { saving: boolean; label: string; onClick?: (e: FormEvent) => void }) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={saving}
      style={{
        minWidth: '110px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.625rem 1.5rem',
        borderRadius: '8px',
        backgroundColor: saving ? 'var(--accent-hover)' : 'var(--accent)',
        color: '#ffffff',
        fontSize: '0.875rem',
        fontWeight: 600,
        border: 'none',
        cursor: saving ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.15s',
      }}
    >
      {saving ? <Spinner /> : label}
    </button>
  );
}

function RowAction({
  children,
  onClick,
  danger,
  disabled,
  style,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="row-icon-btn"
      style={{
        background: 'var(--bg-hover)',
        border: 'none',
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: danger ? 'var(--error-text)' : 'var(--accent)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 26,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  helperText,
  disabled = false,
  error,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  helperText?: string;
  disabled?: boolean;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
        {label} {required && <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{
          width: '100%',
          height: '40px',
          borderRadius: '8px',
          border: error ? '1px solid var(--error-text, #ef4444)' : '1px solid var(--input-border)',
          padding: '0 0.75rem',
          fontSize: '0.875rem',
          outline: 'none',
          backgroundColor: 'var(--input-bg)',
          color: 'var(--text-main)',
          transition: 'border-color 0.15s',
          opacity: disabled ? 0.6 : 1,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = error ? 'var(--error-text, #ef4444)' : 'var(--input-border)'; }}
      />
      {error ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--error-text, #ef4444)', marginTop: '0.25rem' }}>{error}</p>
      ) : helperText ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>{helperText}</p>
      ) : null}
    </div>
  );
}


