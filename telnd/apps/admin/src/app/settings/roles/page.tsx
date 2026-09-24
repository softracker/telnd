'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import { useAuth } from '@/lib/auth-context';
import Toast, { type ToastType } from '@/components/toast';
import RoleBadge from '@/components/role-badge';
import { EditIcon, DeleteIcon, ConfirmIcon } from '@/components/action-icons';
import {
  PERMISSION_RESOURCES,
  ALL_ACTIONS,
  type PermissionAction,
} from '@/lib/permissions';

interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  permissions: unknown;
  isSystem: boolean;
  _count?: { users: number };
}

interface RoleFormState {
  id?: string;
  name: string;
  description: string;
  /** Selected "resource.action" grants. */
  grants: Set<string>;
}

interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

function toGrantList(permissions: unknown): string[] {
  return Array.isArray(permissions) ? permissions.filter((p): p is string => typeof p === 'string') : [];
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

export default function RolesSettingsPage() {
  const { t } = useLanguage();
  const { can } = useAuth();

  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RoleFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  const loadRoles = useCallback(async () => {
    try {
      const res = await api.get<AdminRole[]>('/api/admin/roles');
      setRoles(res || []);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 403) {
        showToast('error', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (can('roles.view')) {
      void loadRoles();
    } else {
      setLoading(false);
    }
  }, [can, loadRoles]);

  const hasFullAccess = (role?: AdminRole) => toGrantList(role?.permissions).includes('*');
  const formIsFull = !!form?.id && hasFullAccess(roles.find((r) => r.id === form.id));

  function startAdd() {
    setForm({ name: '', description: '', grants: new Set() });
  }

  function startEdit(role: AdminRole) {
    const grants = toGrantList(role.permissions).filter((p) => p !== '*');
    setForm({
      id: role.id,
      name: role.name,
      description: role.description ?? '',
      grants: new Set(grants),
    });
  }

  function toggleGrant(resource: string, action: PermissionAction, on: boolean) {
    setForm((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.grants);
      const key = `${resource}.${action}`;
      if (on) next.add(key);
      else next.delete(key);
      return { ...prev, grants: next };
    });
  }

  function toggleRow(resource: string, on: boolean) {
    const def = PERMISSION_RESOURCES.find((r) => r.key === resource);
    if (!def) return;
    setForm((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.grants);
      for (const action of def.actions) {
        const key = `${resource}.${action}`;
        if (on) next.add(key);
        else next.delete(key);
      }
      return { ...prev, grants: next };
    });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form || !form.name.trim()) return;
    setSaving(true);
    try {
      const target = form.id ? roles.find((r) => r.id === form.id) : undefined;
      const isFull = target ? toGrantList(target.permissions).includes('*') : false;
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        permissions: isFull ? ['*'] : Array.from(form.grants),
      };
      if (form.id) {
        await api.put(`/api/admin/roles/${form.id}`, payload);
        showToast('success', t('roles.roleUpdated'));
      } else {
        await api.post('/api/admin/roles', payload);
        showToast('success', t('roles.roleCreated'));
      }
      setForm(null);
      await loadRoles();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: AdminRole) {
    if (pendingDelete !== role.id) {
      setPendingDelete(role.id);
      return;
    }
    setPendingDelete(null);
    try {
      await api.delete(`/api/admin/roles/${role.id}`);
      showToast('success', t('roles.roleDeleted'));
      await loadRoles();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)' }}>
        {t('common.loading')}
      </div>
    );
  }

  if (!can('roles.view')) {
    return (
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
          {t('roles.title')}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)' }}>{t('common.noPermission')}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('roles.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('roles.description')}
      </p>

      {/* ── Role list ── */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>{t('roles.rolesList')}</h3>
          {can('roles.create') && !form && (
            <button
              type="button"
              onClick={startAdd}
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
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('roles.addRole')}
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.875rem' }}>
          {roles.map((role) => {
            const grants = toGrantList(role.permissions);
            const full = hasFullAccess(role);
            return (
              <div
                key={role.id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{role.name}</span>
                  {full ? (
                    <RoleBadge name={t('roles.fullAccess')} full small />
                  ) : (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '999px',
                        background: 'var(--disabled-bg)',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {grants.length} {t('roles.grantCount')}
                    </span>
                  )}
                </div>
                {role.description && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{role.description}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.375rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>
                    {t('roles.adminCount')}: {role._count?.users ?? 0}
                    {role.isSystem && ` · ${t('roles.system')}`}
                  </span>
                  <span style={{ display: 'inline-flex', gap: '0.25rem' }}>
                    {can('roles.edit') && (
                      <RowAction ariaLabel={t('common.edit')} onClick={() => startEdit(role)}>
                        <EditIcon />
                      </RowAction>
                    )}
                    {can('roles.delete') && !role.isSystem && (
                      <RowAction
                        danger
                        ariaLabel={pendingDelete === role.id ? t('account.confirmDelete') : t('common.delete')}
                        onClick={() => handleDelete(role)}
                        style={pendingDelete === role.id ? { background: 'rgba(239, 68, 68, 0.12)' } : undefined}
                      >
                        {pendingDelete === role.id ? <ConfirmIcon /> : <DeleteIcon />}
                      </RowAction>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Create / edit + permission matrix ── */}
      {form && (
        <form onSubmit={handleSave}>
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
              {form.id ? t('roles.editRole') : t('roles.createRole')}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label={t('roles.roleName')} required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })}
                  required
                  style={inputStyle}
                />
              </Field>
              <Field label={t('roles.roleDescription')}>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => f && { ...f, description: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              {t('roles.matrixHint')}
            </p>

            {formIsFull ? (
              <p
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--accent)',
                  background: 'var(--accent-light)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                }}
              >
                {t('roles.fullAccess')}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {t('roles.matrixResource')}
                      </th>
                      {ALL_ACTIONS.map((action) => (
                        <th
                          key={action}
                          style={{
                            textAlign: 'center',
                            padding: '0.5rem',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            minWidth: '4rem',
                          }}
                        >
                          {t(`permAct.${action}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_RESOURCES.map((resource) => {
                      const rowOn = resource.actions.every((a) => form.grants.has(`${resource.key}.${a}`));
                      return (
                        <tr key={resource.key} style={{ borderTop: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.5rem', color: 'var(--text-main)' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={rowOn}
                                onChange={(e) => toggleRow(resource.key, e.target.checked)}
                                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
                              />
                              {t(resource.labelKey)}
                            </label>
                          </td>
                          {ALL_ACTIONS.map((action) => {
                            const supported = resource.actions.includes(action);
                            return (
                              <td key={action} style={{ textAlign: 'center', padding: '0.5rem' }}>
                                <input
                                  type="checkbox"
                                  disabled={!supported}
                                  checked={supported && form.grants.has(`${resource.key}.${action}`)}
                                  onChange={(e) => toggleGrant(resource.key, action, e.target.checked)}
                                  style={{
                                    accentColor: 'var(--accent)',
                                    width: 15,
                                    height: 15,
                                    cursor: supported ? 'pointer' : 'default',
                                    opacity: supported ? 1 : 0.25,
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setForm(null)}
                style={{
                  padding: '0.625rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--input-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
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
                }}
              >
                {saving ? <Spinner /> : t('common.save')}
              </button>
            </div>
          </div>
        </form>
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '40px',
  borderRadius: '8px',
  border: '1px solid var(--input-border)',
  padding: '0 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
  backgroundColor: 'var(--input-bg)',
  color: 'var(--text-main)',
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
        {label} {required && <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function RowAction({ children, onClick, danger, ariaLabel, style }: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        cursor: 'pointer',
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
