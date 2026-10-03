'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import { useAuth } from '@/lib/auth-context';
import Toast, { type ToastType } from '@/components/toast';
import { ListPager } from '@/components/list-pager';
import { Dropdown } from '@/components/dropdown';
import { ConfirmIcon, DeleteIcon, RefreshIcon, ShieldIcon, ShieldOffIcon } from '@/components/action-icons';
import { absoluteTime, countryFlag, describeDevice, relativeTime } from '@/lib/device-format';
import type { TranslationKey } from '@/lib/translations';

// §14.62 — Users management. The list is DataTables-style (server-side
// search / role filter / paging), and EVERYTHING else lives in one modal
// whose contents are fetched from the server when it opens: joined date,
// full profile and analytics sections join the payload later without the
// list growing action buttons.

interface PortalUserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
  twoFactorRequired: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

/** One live session row — token never leaves the server (§14.62). */
interface PortalSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  location: string | null;
  countryCode: string | null;
  lockedAt: string | null;
  createdAt: string;
  expiresAt: string;
}

/** One trusted-device grant — tokenHash never leaves the server (§14.61). */
interface PortalTrustedDevice {
  id: string;
  label: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
}

/** The modal's server payload — the raw safe row (GET /admin/users/:id). */
interface PortalUserDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod: string | null;
  twoFactorEnforced: boolean;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  sessions: PortalSession[];
  trustedDevices: PortalTrustedDevice[];
}

interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

// The portal side of UserRole — role ADMIN is a separate door (/admins).
const ROLE_OPTIONS: Array<{ value: string; labelKey: TranslationKey }> = [
  { value: 'CANDIDATE', labelKey: 'users.role.candidate' },
  { value: 'EMPLOYER', labelKey: 'users.role.employer' },
  { value: 'CREATOR', labelKey: 'users.role.creator' },
  { value: 'FREELANCER', labelKey: 'users.role.freelancer' },
  { value: 'AGENCY', labelKey: 'users.role.agency' },
];
const PAGE_SIZE = 10;

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

/** Feather-style log-out glyph for the "Sign out everywhere" action. */
function SignOutIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// Section-heading style shared by the modal's groups.
const groupLabelStyle = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--muted-text)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 0.625rem',
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
};

const modalCardStyle: React.CSSProperties = {
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
};

/** Labeled modal action button — secondary by default, danger on request,
 * the armed state swaps the label for the house "Confirm?" prompt. */
function ActionButton({
  children,
  onClick,
  busy,
  armed,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  armed?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.375rem',
        minWidth: '110px',
        padding: '0.5rem 0.875rem',
        borderRadius: '8px',
        fontSize: '0.8125rem',
        fontWeight: 600,
        border: 'none',
        cursor: busy || disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        background: danger
          ? armed
            ? 'rgba(239, 68, 68, 0.22)'
            : 'rgba(239, 68, 68, 0.12)'
          : armed
            ? 'var(--accent-light)'
            : 'var(--secondary-btn-bg)',
        color: danger ? 'var(--error-text)' : armed ? 'var(--accent)' : 'var(--text-main)',
      }}
    >
      {busy ? <Spinner size={13} /> : children}
    </button>
  );
}

export default function UsersPage() {
  const { t, language } = useLanguage();
  const { can, isLoading: authLoading, isFullAccess } = useAuth();

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);
  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  // ── List: server-side search + role filter + paging ──
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PortalUserRow[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, filteredTotal: 0, total: 0 });
  const [rowsLoading, setRowsLoading] = useState(true);

  // Debounce the search box; a new query always restarts at page 1.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    try {
      const res = await api.get<{
        items: PortalUserRow[];
        page: number;
        totalPages: number;
        filteredTotal: number;
        total: number;
      }>(
        `/api/admin/users?search=${encodeURIComponent(search)}&role=${encodeURIComponent(roleFilter)}&page=${page}&pageSize=${PAGE_SIZE}`,
      );
      setRows(res.items || []);
      setMeta({ page: res.page, totalPages: res.totalPages, filteredTotal: res.filteredTotal, total: res.total });
      // The server clamps out-of-range pages — follow it so the pager stays truthful.
      if (res.page !== page) setPage(res.page);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 403) showToast('error', err.message);
    } finally {
      setRowsLoading(false);
    }
  }, [search, roleFilter, page, showToast]);

  useEffect(() => {
    if (!authLoading && can('users.view')) void loadRows();
    if (authLoading) setRowsLoading(true);
    else if (!can('users.view')) setRowsLoading(false);
  }, [authLoading, can, loadRows]);

  // ── The modal: one user, loaded from the server on open ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PortalUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const modalOpen = selectedId !== null;

  function closeModal() {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setStatusArm(false);
    setRegenArm(false);
    setTwoFaArm(false);
    setOffArm(false);
    setRevokeArm(false);
    setDeleteArm(false);
  }

  const refetchDetail = useCallback(async (id: string) => {
    try {
      const d = await api.get<PortalUserDetail>(`/api/admin/users/${id}`);
      setDetail(d);
    } catch {
      // Keep whatever copy is on screen — the action itself already toasted.
    }
  }, []);

  // Server-side modal content: fetch the detail row every time it opens.
  // A nonce bump (Retry) re-runs the same guarded fetch.
  const [detailNonce, setDetailNonce] = useState(0);
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    (async () => {
      try {
        const d = await api.get<PortalUserDetail>(`/api/admin/users/${selectedId}`);
        if (!cancelled) setDetail(d);
      } catch (err) {
        if (!cancelled) {
          setDetailError(
            err instanceof ApiError
              ? err.status === 404
                ? t('users.loadFailed')
                : err.message
              : t('common.failed'),
          );
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, detailNonce, t]);

  // Escape closes the modal; the body stays locked while it's open
  // (same behavior as the Admins card's form modal).
  useEffect(() => {
    if (!modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  // ── Modal actions (every one two-click arm → Confirm, spinner while working) ──
  const [statusArm, setStatusArm] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [regenArm, setRegenArm] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [twoFaArm, setTwoFaArm] = useState(false);
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [offArm, setOffArm] = useState(false);
  const [offBusy, setOffBusy] = useState(false);
  const [revokeArm, setRevokeArm] = useState(false);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [deleteArm, setDeleteArm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function handleStatus() {
    if (!detail) return;
    if (!statusArm) {
      setStatusArm(true);
      return;
    }
    setStatusArm(false);
    setStatusBusy(true);
    try {
      if (detail.isActive) {
        await api.patch(`/api/admin/users/${detail.id}/suspend`, {});
        showToast('success', t('users.suspendedToast'));
      } else {
        await api.patch(`/api/admin/users/${detail.id}/activate`, {});
        showToast('success', t('users.activatedToast'));
      }
      await refetchDetail(detail.id);
      void loadRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleRevoke() {
    if (!detail) return;
    if (!revokeArm) {
      setRevokeArm(true);
      return;
    }
    setRevokeArm(false);
    setRevokeBusy(true);
    try {
      const res = await api.post<{ sessions: number; refreshTokens: number; trustedDevices: number }>(
        `/api/admin/users/${detail.id}/revoke-access`,
        {},
      );
      showToast(
        'success',
        res.sessions === 0 && res.trustedDevices === 0
          ? t('users.revokeToastNone')
          : t('users.revokeToast', { sessions: res.sessions, devices: res.trustedDevices }),
      );
      // Nothing in the modal's payload changes (the account stays active),
      // so there is no detail to refetch — only the toast reports the counts.
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setRevokeBusy(false);
    }
  }

  async function handleTwoFa() {
    if (!detail) return;
    if (!twoFaArm) {
      setTwoFaArm(true);
      return;
    }
    setTwoFaArm(false);
    setTwoFaBusy(true);
    const required = !detail.twoFactorEnforced;
    const name = `${detail.firstName} ${detail.lastName}`;
    try {
      await api.patch(`/api/admin/users/${detail.id}/two-factor`, { required });
      showToast(
        'success',
        required ? t('twoFactor.requiredToast', { name }) : t('users.twoFaReleasedToast', { name }),
      );
      await refetchDetail(detail.id);
      void loadRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setTwoFaBusy(false);
    }
  }

  async function handleTurnOffTwoFa() {
    if (!detail) return;
    if (!offArm) {
      setOffArm(true);
      return;
    }
    setOffArm(false);
    setOffBusy(true);
    const name = `${detail.firstName} ${detail.lastName}`;
    try {
      await api.post(`/api/admin/users/${detail.id}/two-factor/disable`, {});
      // The wipe leaves the requirement switch alone (each button owns one
      // thing), so the refetch may still show the "setup required" note —
      // honest, because the next sign-in really does walk into setup.
      showToast('success', t('users.twoFaOffToast', { name }));
      await refetchDetail(detail.id);
      void loadRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setOffBusy(false);
    }
  }

  async function handleResetLink() {
    if (!detail) return;
    if (!regenArm) {
      setRegenArm(true);
      return;
    }
    setRegenArm(false);
    setRegenBusy(true);
    try {
      await api.post(`/api/admin/users/${detail.id}/reset-password`, {});
      showToast('success', t('users.resetSent', { email: detail.email ?? '' }));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setRegenBusy(false);
    }
  }

  async function handleDelete() {
    if (!detail) return;
    if (!deleteArm) {
      setDeleteArm(true);
      return;
    }
    setDeleteArm(false);
    setDeleteBusy(true);
    try {
      await api.delete(`/api/admin/users/${detail.id}`);
      showToast('success', t('users.deletedToast'));
      closeModal();
      void loadRows();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setDeleteBusy(false);
    }
  }

  function roleLabel(role: string): string {
    const hit = ROLE_OPTIONS.find((o) => o.value === role);
    return hit ? t(hit.labelKey) : role;
  }

  const viewPermitted = !authLoading && can('users.view');
  const canSuspend = can('users.edit') || can('admins.edit');

  const pageLoading = authLoading;

  if (pageLoading) {
    return (
      <div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }\n.row-icon-btn:hover { background: var(--accent-light); }`}</style>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Spinner size={18} />
          </div>
          {t('common.loading')}
        </div>
      </div>
    );
  }

  // Typed URLs without the grant never reach here (middleware 404s them
  // first) — this is the belt to that braces.
  if (!viewPermitted) {
    return (
      <div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }\n.row-icon-btn:hover { background: var(--accent-light); }`}</style>
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--muted-text)',
            fontSize: '0.875rem',
          }}
        >
          {t('users.noPermission')}
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }\n.row-icon-btn:hover { background: var(--accent-light); }`}</style>
      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast((prev) => (prev && prev.id === toast.id ? null : prev))}
        />
      )}

      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('users.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('users.description')}
      </p>

      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1.25rem 1.5rem',
        }}
      >
        {/* Toolbar: server-side search + role filter — same layout as the
            Admins card. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 auto', maxWidth: '260px', minWidth: '180px' }}>
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('users.searchPlaceholder')}
              aria-label={t('users.searchPlaceholder')}
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
            value={roleFilter}
            onChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
            options={[
              { value: '', label: t('users.allRoles') },
              ...ROLE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
            ]}
            ariaLabel={t('users.allRoles')}
            style={{ width: '180px' }}
            height={36}
          />
        </div>

        {/* Row list — same anatomy as the Admins list; a row only OPENS
            the modal (every action lives inside it, per the spec). */}
        {rows.map((u, index) => (
          <div
            key={u.id}
            onClick={() => setSelectedId(u.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 0',
              borderTop: index === 0 ? 'none' : '1px solid var(--border-color)',
              opacity: rowsLoading ? 0.6 : 1,
              cursor: 'pointer',
            }}
          >
            {u.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u.avatar}
                alt={`${u.firstName} ${u.lastName}`}
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
                {(u.firstName || u.email || '?').charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {u.firstName} {u.lastName}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.1875rem 0.5rem',
                    borderRadius: '999px',
                    background: 'var(--secondary-btn-bg)',
                    color: 'var(--text-main)',
                  }}
                >
                  {roleLabel(u.role)}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.1875rem 0.5rem',
                    borderRadius: '999px',
                    background: u.isActive ? 'var(--success-bg)' : 'var(--error-bg)',
                    color: u.isActive ? 'var(--success-text)' : 'var(--error-text)',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: u.isActive ? 'var(--success-text)' : 'var(--error-text)',
                    }}
                  />
                  {u.isActive ? t('account.active') : t('account.suspended')}
                </span>
                {(u.twoFactorEnabled || u.twoFactorRequired) && (
                  <span
                    title={u.twoFactorEnabled ? t('twoFactor.badgeOn') : t('twoFactor.badgeRequired')}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.1875rem 0.5rem',
                      borderRadius: '999px',
                      background: u.twoFactorEnabled ? 'var(--success-bg)' : 'var(--accent-light)',
                      color: u.twoFactorEnabled ? 'var(--success-text)' : 'var(--accent)',
                    }}
                  >
                    {u.twoFactorEnabled ? t('twoFactor.badgeOn') : t('twoFactor.badgeRequired')}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>{u.email ?? u.phone}</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(u.id);
              }}
              aria-label={t('users.openDetails')}
              title={t('users.openDetails')}
              className="row-icon-btn"
              style={{
                background: 'var(--bg-hover)',
                border: 'none',
                padding: '0.25rem 0.5rem',
                color: 'var(--accent)',
                cursor: 'pointer',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 26,
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        ))}

        {rowsLoading && (
          <div role="status" style={{ display: 'flex', justifyContent: 'center', padding: '0.625rem 0' }}>
            <Spinner size={16} />
          </div>
        )}

        {rows.length === 0 && !rowsLoading && (
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)', padding: '0.75rem 0' }}>
            {search || roleFilter ? t('common.noResults') : t('users.empty')}
          </p>
        )}

        <ListPager
          page={meta.page}
          totalPages={meta.totalPages}
          filteredTotal={meta.filteredTotal}
          loading={rowsLoading}
          onPageChange={setPage}
          pageSize={PAGE_SIZE}
        />
      </div>

      {/* Server-loaded detail modal — joined date, full profile and
          analytics sections join this payload later. */}
      {modalOpen && (
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={detail ? `${detail.firstName} ${detail.lastName}` : t('users.title')}
            style={modalCardStyle}
          >
            {/* Header — pinned with a divider below; only the body scrolls. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.125rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                flexShrink: 0,
              }}
            >
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                {detail ? `${detail.firstName} ${detail.lastName}` : t('users.title')}
              </h4>
              <button
                type="button"
                onClick={closeModal}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
              {detailLoading && (
                <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem 0', color: 'var(--muted-text)' }}>
                  <Spinner size={18} />
                  {t('common.loading')}
                </div>
              )}

              {!detailLoading && detailError && (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--error-text)', marginBottom: '0.75rem' }}>{detailError}</p>
                  <ActionButton onClick={() => setDetailNonce((n) => n + 1)}>{t('users.retry')}</ActionButton>
                </div>
              )}

              {!detailLoading && detail && (
                <>
                  {/* ── Profile ── */}
                  <p style={groupLabelStyle}>{t('users.sectionIdentity')}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    {detail.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={detail.avatar}
                        alt={`${detail.firstName} ${detail.lastName}`}
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          background: 'var(--secondary-btn-bg)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                        }}
                      >
                        {(detail.firstName || detail.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.1875rem 0.5rem',
                          borderRadius: '999px',
                          background: 'var(--secondary-btn-bg)',
                          color: 'var(--text-main)',
                        }}
                      >
                        {roleLabel(detail.role)}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.1875rem 0.5rem',
                          borderRadius: '999px',
                          background: detail.isActive ? 'var(--success-bg)' : 'var(--error-bg)',
                          color: detail.isActive ? 'var(--success-text)' : 'var(--error-text)',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: detail.isActive ? 'var(--success-text)' : 'var(--error-text)',
                          }}
                        />
                        {detail.isActive ? t('account.active') : t('account.suspended')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
                    <span style={{ color: 'var(--muted-text)' }}>{t('account.email')}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', color: 'var(--text-main)' }}>
                      {detail.email ?? <span style={{ color: 'var(--muted-text)' }}>{t('users.noEmail')}</span>}
                      {detail.email && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '0.125rem 0.4375rem',
                            borderRadius: '999px',
                            background: detail.isEmailVerified ? 'var(--success-bg)' : 'var(--secondary-btn-bg)',
                            color: detail.isEmailVerified ? 'var(--success-text)' : 'var(--muted-text)',
                          }}
                        >
                          {detail.isEmailVerified ? t('users.verified') : t('users.notVerified')}
                        </span>
                      )}
                    </span>
                    <span style={{ color: 'var(--muted-text)' }}>{t('account.phone')}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', color: 'var(--text-main)' }}>
                      {detail.phone ?? <span style={{ color: 'var(--muted-text)' }}>{t('users.noPhone')}</span>}
                      {detail.phone && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '0.125rem 0.4375rem',
                            borderRadius: '999px',
                            background: detail.isPhoneVerified ? 'var(--success-bg)' : 'var(--secondary-btn-bg)',
                            color: detail.isPhoneVerified ? 'var(--success-text)' : 'var(--muted-text)',
                          }}
                        >
                          {detail.isPhoneVerified ? t('users.verified') : t('users.notVerified')}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* ── Two-factor ── */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={groupLabelStyle}>{t('users.sectionTwoFactor')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.625rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.1875rem 0.5rem',
                        borderRadius: '999px',
                        background: detail.twoFactorEnabled
                          ? 'var(--success-bg)'
                          : detail.twoFactorEnforced
                            ? 'var(--accent-light)'
                            : 'var(--secondary-btn-bg)',
                        color: detail.twoFactorEnabled
                          ? 'var(--success-text)'
                          : detail.twoFactorEnforced
                            ? 'var(--accent)'
                            : 'var(--muted-text)',
                      }}
                    >
                      {detail.twoFactorEnabled
                        ? t('twoFactor.badgeOn')
                        : detail.twoFactorEnforced
                          ? t('twoFactor.badgeRequired')
                          : t('users.twoFaOff')}
                    </span>
                    {isFullAccess && (
                      <ActionButton onClick={handleTwoFa} busy={twoFaBusy} armed={twoFaArm}>
                        {twoFaArm ? (
                          t('account.confirmStatus')
                        ) : detail.twoFactorEnforced ? (
                          <>
                            <ShieldIcon /> {t('users.releaseTwoFa')}
                          </>
                        ) : (
                          <>
                            <ShieldIcon /> {t('users.requireTwoFa')}
                          </>
                        )}
                      </ActionButton>
                    )}
                    {isFullAccess && detail.twoFactorEnabled && (
                      <ActionButton onClick={handleTurnOffTwoFa} busy={offBusy} armed={offArm}>
                        {offArm ? (
                          t('account.confirmStatus')
                        ) : (
                          <>
                            <ShieldOffIcon /> {t('users.turnOff2Fa')}
                          </>
                        )}
                      </ActionButton>
                    )}
                  </div>
                    {detail.twoFactorEnforced && !detail.twoFactorEnabled && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', margin: '0', lineHeight: 1.6 }}>
                        {t('users.twoFaRequiredNote')}
                      </p>
                    )}
                  </div>

                  {/* ── Logged in devices ── */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={groupLabelStyle}>{t('security.devicesTitle')}</p>
                    {detail.sessions.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', margin: 0, lineHeight: 1.6 }}>
                        {t('users.sessionsEmpty')}
                      </p>
                    ) : (
                      detail.sessions.map((s, i) => {
                        const device = describeDevice(s.userAgent, t);
                        return (
                          <div
                            key={s.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.625rem',
                              padding: '0.5rem 0',
                              borderTop: i === 0 ? 'none' : '1px solid var(--border-color)',
                            }}
                          >
                            <span aria-hidden="true" style={{ fontSize: '1.125rem', width: 26, textAlign: 'center', flexShrink: 0 }}>
                              {device.icon}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{device.name}</span>
                                {s.location && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>
                                    · {countryFlag(s.countryCode)} {s.location}
                                  </span>
                                )}
                                {s.ipAddress && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>· {s.ipAddress}</span>
                                )}
                                {s.lockedAt && (
                                  <span
                                    style={{
                                      fontSize: '0.6875rem',
                                      fontWeight: 600,
                                      padding: '0.0625rem 0.4375rem',
                                      borderRadius: '999px',
                                      background: 'var(--accent-light)',
                                      color: 'var(--accent)',
                                    }}
                                  >
                                    {t('users.sessionLocked')}
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--muted-text)',
                                  marginTop: '0.125rem',
                                  display: 'flex',
                                  gap: '0.75rem',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <span title={absoluteTime(s.createdAt, language)}>
                                  {t('security.signedInAt', { when: relativeTime(s.createdAt, language) })}
                                </span>
                                <span title={absoluteTime(s.expiresAt, language)}>
                                  {t('users.sessionExpires', { when: relativeTime(s.expiresAt, language) })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ── Trusted devices ── */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={groupLabelStyle}>{t('users.sectionDevices')}</p>
                    {detail.trustedDevices.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', margin: 0, lineHeight: 1.6 }}>
                        {t('users.devicesEmpty')}
                      </p>
                    ) : (
                      detail.trustedDevices.map((d, i) => {
                        const device = describeDevice(d.userAgent, t);
                        return (
                          <div
                            key={d.id}
                            style={{
                              padding: '0.5rem 0',
                              borderTop: i === 0 ? 'none' : '1px solid var(--border-color)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span aria-hidden="true" style={{ fontSize: '1.125rem' }}>
                                {device.icon}
                              </span>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{d.label}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>{device.name}</span>
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--muted-text)',
                                marginTop: '0.125rem',
                                display: 'flex',
                                gap: '0.75rem',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span title={absoluteTime(d.lastUsedAt, language)}>
                                {t('users.deviceLastUsed', { when: relativeTime(d.lastUsedAt, language) })}
                              </span>
                              <span title={absoluteTime(d.createdAt, language)}>
                                {t('users.deviceTrustedSince', { when: relativeTime(d.createdAt, language) })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ── Actions ── */}
                  <p style={groupLabelStyle}>{t('users.sectionActions')}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {canSuspend && (
                      <ActionButton onClick={handleStatus} busy={statusBusy} armed={statusArm}>
                        {statusArm ? (
                          t('account.confirmStatus')
                        ) : detail.isActive ? (
                          t('account.suspend')
                        ) : (
                          t('account.activate')
                        )}
                      </ActionButton>
                    )}
                    {canSuspend && (
                      <ActionButton onClick={handleRevoke} busy={revokeBusy} armed={revokeArm}>
                        {revokeArm ? (
                          t('account.confirmStatus')
                        ) : (
                          <>
                            <SignOutIcon /> {t('users.signOutAll')}
                          </>
                        )}
                      </ActionButton>
                    )}
                    {isFullAccess && (
                      <ActionButton onClick={handleResetLink} busy={regenBusy} armed={regenArm}>
                        {regenArm ? (
                          t('account.confirmRegenerate')
                        ) : (
                          <>
                            <RefreshIcon /> {t('account.regenerate')}
                          </>
                        )}
                      </ActionButton>
                    )}
                    {can('users.delete') && (
                      <ActionButton onClick={handleDelete} busy={deleteBusy} armed={deleteArm} danger>
                        {deleteArm ? (
                          <>
                            <ConfirmIcon /> {t('account.confirmDelete')}
                          </>
                        ) : (
                          <>
                            <DeleteIcon /> {t('common.delete')}
                          </>
                        )}
                      </ActionButton>
                    )}
                  </div>
                  {canSuspend && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', margin: '0.625rem 0 0', lineHeight: 1.6 }}>
                      {t('users.revokeNote')}
                    </p>
                  )}
                  {can('users.delete') && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', margin: '0.625rem 0 0', lineHeight: 1.6 }}>
                      {t('users.deleteNote')}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
