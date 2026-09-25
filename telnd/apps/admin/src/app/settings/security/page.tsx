'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';
import { type TranslationKey } from '@/lib/translations';

interface DeviceSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  isCurrent: boolean;
}

interface SecurityData {
  lastLoginAt: string | null;
  sessions: DeviceSession[];
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

// "12 minutes ago" / "৫ দিন আগে" — Intl.RelativeTimeFormat handles both
// locales, so no per-unit translation keys are needed.
function relativeTime(iso: string, language: string): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  return rtf.format(Math.round(diffSec / 2592000), 'month');
}

function absoluteTime(iso: string, language: string): string {
  return new Date(iso).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Browser + OS + form factor parsed from the stored user-agent. Unknown or
// missing agents fall back to "Not recorded" instead of a raw UA string.
function describeDevice(ua: string | null, t: (key: TranslationKey) => string): { name: string; icon: string } {
  if (!ua) return { name: t('security.notRecorded'), icon: '💻' };
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : null;
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android'
    : /Linux/.test(ua) ? 'Linux'
    : null;
  if (!browser && !os) return { name: t('security.notRecorded'), icon: '💻' };
  const icon = /Mobile|iPhone|iPad|Android|Silk/.test(ua) ? '📱' : '💻';
  const name = browser && os ? `${browser} on ${os}` : browser || os;
  return { name: name as string, icon };
}

// "This device" pill — used on the Last login card and the current row.
const pillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.125rem 0.5rem',
  borderRadius: '999px',
  backgroundColor: 'var(--accent-light)',
  color: 'var(--accent)',
  fontSize: '0.6875rem',
  fontWeight: 600,
} as const;

export default function SecuritySettingsPage() {
  const { t, language } = useLanguage();

  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);
  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  // ── Sessions / trusted devices ──
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SecurityData | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: SecurityData }>('/api/users/me/sessions');
      setData(res.data);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Change password ──
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  // Armed after a failed submit: each inline error clears itself the moment
  // its condition is fixed (mirrors the confirm-email pattern on Account).
  const [currentWrong, setCurrentWrong] = useState(false);
  const [shortArmed, setShortArmed] = useState(false);
  const [mismatchArmed, setMismatchArmed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    const short = next.length < 8;
    const mismatch = confirm !== next;
    setShortArmed(short);
    setMismatchArmed(mismatch);
    if (short || mismatch) return;

    setSaving(true);
    try {
      await api.post('/api/users/me/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      setCurrent('');
      setNext('');
      setConfirm('');
      setCurrentWrong(false);
      setShortArmed(false);
      setMismatchArmed(false);
      showToast('success', t('security.passwordChanged'));
    } catch (err) {
      if (err instanceof ApiError && (err.data as any)?.error?.code === 'INVALID_CURRENT_PASSWORD') {
        setCurrentWrong(true);
      } else {
        showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Regenerate (two-click confirm, like every other destructive action) ──
  const [pendingRegen, setPendingRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    if (!pendingRegen) {
      setPendingRegen(true);
      return;
    }
    setPendingRegen(false);
    setRegenerating(true);
    try {
      await api.post('/api/users/me/regenerate-password', {});
      showToast('success', t('security.regeneratedSelf'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setRegenerating(false);
    }
  }

  // ── Device revocation (two-click confirm as well) ──
  const [pendingSignOut, setPendingSignOut] = useState<string | null>(null);
  const [pendingSignOutAll, setPendingSignOutAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  async function handleSignOut(s: DeviceSession) {
    if (pendingSignOut !== s.id) {
      setPendingSignOut(s.id);
      return;
    }
    setPendingSignOut(null);
    setRevokingId(s.id);
    try {
      await api.delete(`/api/users/me/sessions/${s.id}`);
      showToast('success', t('security.deviceSignedOut'));
      await loadSessions();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setRevokingId(null);
    }
  }

  async function handleSignOutOthers() {
    if (!pendingSignOutAll) {
      setPendingSignOutAll(true);
      return;
    }
    setPendingSignOutAll(false);
    setRevokingAll(true);
    try {
      await api.delete('/api/users/me/sessions');
      showToast('success', t('security.othersSignedOut'));
      await loadSessions();
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setRevokingAll(false);
    }
  }

  const lastLoginAt = data ? data.lastLoginAt ?? data.sessions[0]?.createdAt ?? null : null;
  const lastSession = data?.sessions[0];
  const prevSession = data?.sessions[1];
  const hasOthers = !!data?.sessions.some((s) => !s.isCurrent);

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('security.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('security.description')}
      </p>

      {loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <Spinner size={18} />
          </div>
          {t('common.loading')}
        </div>
      )}

      {!loading && data && (
        <>
          {/* ── Password + Last login side by side; stack on narrow screens ── */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ flex: '1 1 380px', minWidth: 0 }}>
              <Section title={t('security.passwordTitle')} description={t('security.passwordDesc')}>
                <form onSubmit={handleChangePassword}>
                  <PasswordInput
                    label={t('security.currentPassword')}
                    value={current}
                    onChange={(v) => {
                      setCurrent(v);
                      setCurrentWrong(false);
                    }}
                    required
                    autoComplete="current-password"
                    error={currentWrong ? t('security.currentPasswordWrong') : undefined}
                  />
                  <PasswordInput
                    label={t('security.newPassword')}
                    value={next}
                    onChange={setNext}
                    required
                    autoComplete="new-password"
                    error={shortArmed && next.length < 8 ? t('security.passwordTooShort') : undefined}
                    helperText={!(shortArmed && next.length < 8) ? t('security.passwordHint') : undefined}
                  />
                  <PasswordInput
                    label={t('security.confirmPassword')}
                    value={confirm}
                    onChange={setConfirm}
                    required
                    autoComplete="new-password"
                    error={mismatchArmed && confirm !== next ? t('security.passwordMismatch') : undefined}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <SaveButton saving={saving} label={t('security.changePassword')} />
                  </div>
                </form>

                {/* ── or ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.125rem 0 0.75rem' }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-color)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('security.or')}</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'var(--border-color)' }} />
                </div>

                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating || saving}
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: pendingRegen ? 'var(--accent-light)' : 'var(--secondary-btn-bg)',
                    color: pendingRegen ? 'var(--accent)' : 'var(--text-main)',
                    border: pendingRegen ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: regenerating || saving ? 'not-allowed' : 'pointer',
                    opacity: regenerating || saving ? 0.7 : 1,
                    transition: 'background-color 0.15s',
                  }}
                >
                  {regenerating ? (
                    <Spinner size={14} />
                  ) : pendingRegen ? (
                    t('account.confirmStatus')
                  ) : (
                    t('security.regenerateSelf')
                  )}
                </button>
              </Section>
            </div>

            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <Section title={t('security.lastLoginTitle')} description={t('security.lastLoginDesc')}>
                {!lastLoginAt ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{t('security.noLoginInfo')}</p>
                ) : (
                  <>
                    <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {relativeTime(lastLoginAt, language)}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.125rem',
                        marginBottom: '0.875rem',
                      }}
                    >
                      {absoluteTime(lastLoginAt, language)}
                    </div>
                    <InfoRow
                      label={t('security.ipLabel')}
                      value={lastSession?.ipAddress ?? t('security.notRecorded')}
                    />
                    <InfoRow
                      label={t('security.deviceLabel')}
                      value={describeDevice(lastSession?.userAgent ?? null, t).name}
                    />
                    {lastSession?.isCurrent && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <span style={pillStyle}>{t('security.thisDevice')}</span>
                      </div>
                    )}
                    {prevSession && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          paddingTop: '0.625rem',
                          borderTop: '1px solid var(--border-color)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {t('security.earlierLogin')} · {absoluteTime(prevSession.createdAt, language)}
                      </div>
                    )}
                  </>
                )}
              </Section>
            </div>
          </div>

          {/* ── Trusted devices ── */}
          <Section title={t('security.devicesTitle')} description={t('security.devicesDesc')}>
            {data.sessions.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{t('security.noLoginInfo')}</p>
            ) : (
              <>
                {data.sessions.map((s, i) => {
                  const device = describeDevice(s.userAgent, t);
                  const armed = pendingSignOut === s.id;
                  const busy = revokingId === s.id;
                  const locked = revokingId !== null || revokingAll;
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 0',
                        borderTop: i === 0 ? 'none' : '1px solid var(--border-color)',
                      }}
                    >
                      <span aria-hidden="true" style={{ fontSize: '1.25rem', width: 32, textAlign: 'center', flexShrink: 0 }}>
                        {device.icon}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {device.name}
                          </span>
                          {s.ipAddress && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>· {s.ipAddress}</span>
                          )}
                          {s.isCurrent && <span style={pillStyle}>{t('security.thisDevice')}</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                          {t('security.signedInAt', { when: relativeTime(s.createdAt, language) })}
                        </div>
                      </div>
                      {!s.isCurrent && (
                        <RowAction
                          ariaLabel={armed ? t('account.confirmStatus') : t('security.signOut')}
                          onClick={() => handleSignOut(s)}
                          disabled={locked}
                          style={armed ? { background: 'var(--accent-light)', color: 'var(--accent)' } : undefined}
                        >
                          {busy ? (
                            <Spinner size={13} />
                          ) : armed ? (
                            t('account.confirmStatus')
                          ) : (
                            t('security.signOut')
                          )}
                        </RowAction>
                      )}
                    </div>
                  );
                })}

                {hasOthers && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '0.5rem',
                      paddingTop: '0.875rem',
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleSignOutOthers}
                      disabled={revokingAll || revokingId !== null}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.875rem',
                        borderRadius: '8px',
                        backgroundColor: pendingSignOutAll ? 'var(--accent-light)' : 'var(--secondary-btn-bg)',
                        color: pendingSignOutAll ? 'var(--accent)' : 'var(--text-main)',
                        border: pendingSignOutAll ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        cursor: revokingAll || revokingId !== null ? 'not-allowed' : 'pointer',
                        opacity: revokingAll || revokingId !== null ? 0.7 : 1,
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {revokingAll ? (
                        <Spinner size={13} />
                      ) : pendingSignOutAll ? (
                        t('account.confirmStatus')
                      ) : (
                        t('security.signOutOthers')
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </Section>
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
        height: '100%',
        boxSizing: 'border-box',
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

// Label/value line used on the Last login card.
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.4375rem 0',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.8125rem',
      }}
    >
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span
        style={{
          color: 'var(--text-main)',
          fontWeight: 500,
          textAlign: 'right',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      style={{
        minWidth: '140px',
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
  disabled,
  style,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
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
        padding: '0.25rem 0.625rem',
        fontSize: '0.75rem',
        fontWeight: 500,
        color: 'var(--accent)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        borderRadius: '6px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 26,
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  required,
  error,
  helperText,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
  autoComplete?: string;
}) {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);
  const hint = show ? t('security.hidePassword') : t('security.showPassword');
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
        {label} {required && <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            height: '40px',
            borderRadius: '8px',
            border: error ? '1px solid var(--error-text, #ef4444)' : '1px solid var(--input-border)',
            padding: '0 2.5rem 0 0.75rem',
            fontSize: '0.875rem',
            outline: 'none',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-main)',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--error-text, #ef4444)' : 'var(--input-border)';
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={hint}
          title={hint}
          style={{
            position: 'absolute',
            right: '0.625rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted-text)',
          }}
        >
          {show ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--error-text, #ef4444)', marginTop: '0.25rem' }}>{error}</p>
      ) : helperText ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>{helperText}</p>
      ) : null}
    </div>
  );
}
