'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import { useAuth } from '@/lib/auth-context';
import Toast, { type ToastType } from '@/components/toast';
import RoleBadge from '@/components/role-badge';

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
  password: string;
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

export default function TeamAccountSettingsPage() {
  const { t } = useLanguage();
  const { user, can, refreshUser } = useAuth();

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);
  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  // ── My account ──
  const [profile, setProfile] = useState({ firstName: '', lastName: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch('/api/users/me', profile);
      await refreshUser();
      showToast('success', t('account.profileSaved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Admin accounts ──
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [adminForm, setAdminForm] = useState<AdminFormState | null>(null);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [pendingDeleteAdmin, setPendingDeleteAdmin] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    try {
      const [adminsRes, rolesRes] = await Promise.allSettled([
        api.get<{ admins: AdminAccount[] }>('/api/admin/admins'),
        api.get<AdminRole[]>('/api/admin/roles'),
      ]);
      if (adminsRes.status === 'fulfilled') {
        setAdmins(adminsRes.value.admins || []);
      } else {
        throw adminsRes.reason;
      }
      // The role select is only needed for add/edit — tolerate missing roles.view.
      if (rolesRes.status === 'fulfilled') {
        setRoles(rolesRes.value || []);
      } else {
        setRoles([]);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status !== 403) {
        showToast('error', err.message);
      }
    } finally {
      setLoadingAdmins(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (can('admins.view')) {
      void loadAdmins();
    } else {
      setLoadingAdmins(false);
    }
  }, [can, loadAdmins]);

  function startAddAdmin() {
    setAdminForm({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      roleId: roles[0]?.id ?? '',
    });
  }

  function startEditAdmin(a: AdminAccount) {
    setAdminForm({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email ?? '',
      password: '',
      roleId: a.roleId ?? '',
    });
  }

  async function handleAdminSave(e: FormEvent) {
    e.preventDefault();
    if (!adminForm) return;
    setSavingAdmin(true);
    try {
      const { id, password, ...rest } = adminForm;
      if (id) {
        await api.patch(`/api/admin/admins/${id}`, rest);
        showToast('success', t('account.adminUpdated'));
      } else {
        await api.post('/api/admin/admins', { ...rest, password });
        showToast('success', t('account.adminCreated'));
      }
      setAdminForm(null);
      await loadAdmins();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSavingAdmin(false);
    }
  }

  async function handleAdminStatus(a: AdminAccount) {
    try {
      if (a.isActive) {
        await api.patch(`/api/admin/users/${a.id}/suspend`, {});
      } else {
        await api.patch(`/api/admin/users/${a.id}/activate`, {});
      }
      await loadAdmins();
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
      await loadAdmins();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
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
          {t('common.loading')}
        </div>
      )}

      {!pageLoading && (
        <>
          {/* ── My Account ── */}
          <Section title={t('account.myAccount')} description={t('account.myAccountDesc')}>
            <form onSubmit={handleProfileSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <SaveButton saving={savingProfile} label={t('account.saveProfile')} />
              </div>
            </form>
          </Section>

          {/* ── Admin Accounts ── */}
          {can('admins.view') && (
            <Section title={t('account.admins')} description={t('account.adminsDesc')}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => (adminForm ? setAdminForm(null) : startAddAdmin())}
                  disabled={!adminForm && !can('admins.create')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: adminForm || can('admins.create') ? 'pointer' : 'not-allowed',
                    opacity: adminForm || can('admins.create') ? 1 : 0.5,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {adminForm ? <line x1="18" y1="6" x2="6" y2="18" /> : <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
                  </svg>
                  {adminForm ? t('common.cancel') : t('account.addAdmin')}
                </button>
              </div>

              {adminForm && (
                <form onSubmit={handleAdminSave} style={{ marginBottom: '1.25rem' }}>
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
                    />
                    {!adminForm.id && (
                      <Input
                        label={t('account.initialPassword')}
                        value={adminForm.password}
                        onChange={(v) => setAdminForm((f) => f && { ...f, password: v })}
                        type="text"
                        required
                        helperText={t('account.passwordHint')}
                      />
                    )}
                    <Select
                      label={t('account.role')}
                      value={adminForm.roleId}
                      onChange={(v) => setAdminForm((f) => f && { ...f, roleId: v })}
                      options={roles.map((r) => ({ value: r.id, label: r.name }))}
                      required
                      disabled={adminForm.id === user?.id}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <SaveButton saving={savingAdmin} label={adminForm.id ? t('common.save') : t('account.createAdmin')} />
                  </div>
                </form>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{t('account.name')}</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{t('account.email')}</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{t('account.role')}</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{t('account.status')}</th>
                      <th style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a) => (
                      <tr key={a.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-main)', fontWeight: 500 }}>
                          {a.firstName} {a.lastName}
                          {a.isSelf && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.6875rem', color: 'var(--muted-text)' }}>
                              ({t('account.you')})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-muted)' }}>{a.email}</td>
                        <td style={{ padding: '0.625rem 0.75rem' }}>
                          {a.roleName ? (
                            <RoleBadge name={a.roleName} full={a.permissions.includes('*')} small />
                          ) : (
                            <span style={{ color: 'var(--muted-text)' }}>{t('account.noRole')}</span>
                          )}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem' }}>
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
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {can('admins.edit') && !a.isSelf && (
                            <RowAction onClick={() => startEditAdmin(a)}>{t('common.edit')}</RowAction>
                          )}
                          {(can('users.edit') || can('admins.edit')) && !a.isSelf && (
                            <RowAction onClick={() => handleAdminStatus(a)}>
                              {a.isActive ? t('account.suspend') : t('account.activate')}
                            </RowAction>
                          )}
                          {can('admins.delete') && !a.isSelf && (
                            <RowAction
                              danger
                              onClick={() => handleAdminDelete(a)}
                              style={{ fontWeight: pendingDeleteAdmin === a.id ? 700 : 500 }}
                            >
                              {pendingDeleteAdmin === a.id ? t('account.confirmDelete') : t('common.delete')}
                            </RowAction>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
      style={{
        background: 'none',
        border: 'none',
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: danger ? 'var(--error-text)' : 'var(--accent)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        borderRadius: '6px',
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  helperText?: string;
  disabled?: boolean;
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
        style={{
          width: '100%',
          height: '40px',
          borderRadius: '8px',
          border: '1px solid var(--input-border)',
          padding: '0 0.75rem',
          fontSize: '0.875rem',
          outline: 'none',
          backgroundColor: 'var(--input-bg)',
          color: 'var(--text-main)',
          transition: 'border-color 0.15s',
          opacity: disabled ? 0.6 : 1,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
      />
      {helperText && (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>{helperText}</p>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options, required, disabled }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
        {label} {required && <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        style={{
          width: '100%',
          height: '40px',
          borderRadius: '8px',
          border: '1px solid var(--input-border)',
          padding: '0 0.75rem',
          fontSize: '0.875rem',
          outline: 'none',
          backgroundColor: 'var(--input-bg)',
          color: 'var(--text-main)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {options.length === 0 && <option value="">—</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
