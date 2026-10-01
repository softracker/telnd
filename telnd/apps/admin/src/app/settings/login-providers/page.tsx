'use client';

// Login methods for the USER sign-in page: Email and Phone Number first
// (built-in — a switch each, no credentials), then the OAuth providers
// Google / Facebook / LinkedIn (credentials + redirect URI + console steps).
// Admin sign-in never reads this section. Laid out like the object-storage
// page: the switch arms the card, Save persists everything at the bottom.

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';

// The built-in methods (email/password, email login link, phone) — a switch
// each, nothing to configure — come first; the OAuth providers follow with
// credentials. Admin sign-in never reads this section.
type ProviderKey = 'email' | 'emailLink' | 'phone' | 'google' | 'facebook' | 'linkedin';
type BuiltInKey = 'email' | 'emailLink' | 'phone';
type OAuthKey = 'google' | 'facebook' | 'linkedin';

interface ProviderConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
}

type ProviderState = Record<ProviderKey, ProviderConfig>;

interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

// Email (password) and the email login link at the top of the list, then
// phone, then the OAuth providers.
const PROVIDERS: readonly ProviderKey[] = ['email', 'emailLink', 'phone', 'google', 'facebook', 'linkedin'];
const BUILT_IN: readonly BuiltInKey[] = ['email', 'emailLink', 'phone'];
const OAUTH_PROVIDERS: readonly OAuthKey[] = ['google', 'facebook', 'linkedin'];

const isBuiltIn = (key: ProviderKey): key is BuiltInKey => (BUILT_IN as readonly string[]).includes(key);
const isOAuth = (key: ProviderKey): key is OAuthKey => (OAUTH_PROVIDERS as readonly string[]).includes(key);

const emptyConfig = (enabled = false): ProviderConfig => ({ enabled, clientId: '', clientSecret: '' });

// Email, the email login link and phone login are ON until someone turns
// them off — they are the baseline methods the site already offers; OAuth
// starts off until credentials are entered.
const emptyState = (): ProviderState => ({
  email: emptyConfig(true),
  emailLink: emptyConfig(true),
  phone: emptyConfig(true),
  google: emptyConfig(),
  facebook: emptyConfig(),
  linkedin: emptyConfig(),
});

// Normalizes whatever the API returned (partial, missing fields, an older
// stored shape) into the exact state this form edits. Methods absent from
// the stored value keep their default (email/phone on, OAuth off).
function normalize(raw: unknown): ProviderState {
  const state = emptyState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return state;
  for (const key of PROVIDERS) {
    const entry = (raw as Record<string, unknown>)[key];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    state[key] = {
      enabled: e.enabled === true,
      clientId: typeof e.clientId === 'string' ? e.clientId : '',
      clientSecret: typeof e.clientSecret === 'string' ? e.clientSecret : '',
    };
  }
  return state;
}

// Method badge — the providers show their ACTUAL brand marks and company
// colors (Google's four-color G on white, white f on Facebook blue, white
// "in" on LinkedIn blue); the built-in email/phone methods use the site's
// own accent with a white glyph.
function MethodBadge({ provider }: { provider: ProviderKey }) {
  const box: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    boxSizing: 'border-box',
  };
  const stroke: React.CSSProperties = { display: 'block' };

  if (provider === 'email') {
    return (
      <span aria-hidden="true" style={{ ...box, backgroundColor: 'var(--accent)', border: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={stroke}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </span>
    );
  }
  if (provider === 'emailLink') {
    // The magic-link method: a chain link on the site's accent.
    return (
      <span aria-hidden="true" style={{ ...box, backgroundColor: 'var(--accent)', border: 'none' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={stroke}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </span>
    );
  }
  if (provider === 'phone') {
    return (
      <span aria-hidden="true" style={{ ...box, backgroundColor: 'var(--accent)', border: 'none' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={stroke}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </span>
    );
  }
  if (provider === 'google') {
    // Google's official G — the four brand colors on white.
    return (
      <span aria-hidden="true" style={{ ...box, backgroundColor: '#ffffff' }}>
        <svg width="18" height="18" viewBox="0 0 48 48" style={stroke}>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
      </span>
    );
  }
  if (provider === 'facebook') {
    // Facebook blue (#1877F2) with the white f.
    return (
      <span aria-hidden="true" style={{ ...box, backgroundColor: '#1877F2', border: 'none' }}>
        <svg width="15" height="15" viewBox="0 0 320 512" fill="#ffffff" style={stroke}>
          <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
        </svg>
      </span>
    );
  }
  // LinkedIn blue (#0A66C2) with the white "in".
  return (
    <span aria-hidden="true" style={{ ...box, backgroundColor: '#0A66C2', border: 'none' }}>
      <svg width="16" height="16" viewBox="0 0 448 512" fill="#ffffff" style={stroke}>
        <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z" />
      </svg>
    </span>
  );
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
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 0 12 4v4z" opacity="0.8" />
    </svg>
  );
}

export default function LoginProvidersPage() {
  const { t } = useLanguage();
  const { can } = useAuth();
  const canEdit = can('loginProviders.edit');
  const [settings, setSettings] = useState<ProviderState>(emptyState);
  const [siteUrl, setSiteUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ success: boolean; data: Record<string, unknown> }>('/api/settings');
        if (res.success) {
          if (res.data.loginProviders) setSettings(normalize(res.data.loginProviders));
          const general = res.data.general as { siteUrl?: unknown } | undefined;
          if (general && typeof general.siteUrl === 'string') setSiteUrl(general.siteUrl.trim());
        }
      } catch (err) {
        if (err instanceof ApiError && err.status !== 404) showToast('error', err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  // The URL to paste into the provider's dashboard. Derived from the site's
  // own URL (General settings) so all three consoles get the same origin;
  // until one is set, the placeholder shows the shape of the value.
  const redirectFor = useCallback(
    (provider: ProviderKey): string => {
      const base = siteUrl.replace(/\/+$/, '');
      return `${base || 'https://your-domain.com'}/auth/callback/${provider}`;
    },
    [siteUrl],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Client-side gate first for a friendly message; the API re-checks and
    // answers CREDENTIALS_REQUIRED if anything slips past. Only the OAuth
    // providers carry credentials — email/phone are switch-only.
    for (const key of OAUTH_PROVIDERS) {
      const cfg = settings[key];
      if (cfg.enabled && (!cfg.clientId.trim() || !cfg.clientSecret.trim())) {
        showToast('error', t('loginProviders.credentialsRequired', { name: t(`loginProviders.${key}`) }));
        return;
      }
    }
    setSaving(true);
    try {
      const res = await api.put<{ success: boolean; data: Record<string, unknown> }>('/api/settings', {
        loginProviders: settings,
      });
      if (res.success && res.data.loginProviders) setSettings(normalize(res.data.loginProviders));
      showToast('success', t('loginProviders.saved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSaving(false);
    }
  }

  function update(provider: ProviderKey, patch: Partial<ProviderConfig>) {
    setSettings(prev => ({ ...prev, [provider]: { ...prev[provider], ...patch } }));
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)' }}>{t('smtp.loading')}</div>;
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
    transition: 'border-color 0.15s',
    fontFamily: 'monospace',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--label-text)',
    marginBottom: '0.375rem',
  };

  const helpStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--muted-text)',
    marginTop: '0.25rem',
    lineHeight: 1.5,
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('loginProviders.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
        {t('loginProviders.description')}
      </p>
      <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        {t('loginProviders.userOnlyNote')}
      </p>

      <form onSubmit={handleSubmit}>
        {PROVIDERS.map((key) => {
          const cfg = settings[key];
          const name = t(`loginProviders.${key}`);
          const oauth = isOAuth(key);
          return (
            <div
              key={key}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1rem',
              }}
            >
              {/* Enable/Disable row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <MethodBadge provider={key} />
                  <div>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>{name}</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                      {isBuiltIn(key)
                        ? t(`loginProviders.${key}Desc`)
                        : t('loginProviders.providerDesc', { name })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={cfg.enabled}
                  aria-label={t('loginProviders.enableProvider', { name })}
                  title={t('loginProviders.enableProvider', { name })}
                  disabled={!canEdit}
                  onClick={() => update(key, { enabled: !cfg.enabled })}
                  style={{
                    width: '48px',
                    height: '26px',
                    borderRadius: '13px',
                    border: 'none',
                    backgroundColor: cfg.enabled ? 'var(--accent)' : 'var(--input-border)',
                    position: 'relative',
                    cursor: canEdit ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s',
                    flexShrink: 0,
                    opacity: canEdit ? 1 : 0.5,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: cfg.enabled ? '25px' : '3px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>

              {/* Credentials, redirect URI and console steps — OAuth only */}
              {oauth && cfg.enabled && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label htmlFor={`${key}-client-id`} style={labelStyle}>
                        {t('loginProviders.clientId')} <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>
                      </label>
                      <input
                        id={`${key}-client-id`}
                        type="text"
                        value={cfg.clientId}
                        onChange={(e) => update(key, { clientId: e.target.value })}
                        placeholder={key === 'google' ? 'xxxxx.apps.googleusercontent.com' : ''}
                        required
                        readOnly={!canEdit}
                        autoComplete="off"
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                      />
                      <p style={helpStyle}>{t(`loginProviders.${key}IdHelp`)}</p>
                    </div>
                    <div>
                      <label htmlFor={`${key}-client-secret`} style={labelStyle}>
                        {t('loginProviders.clientSecret')} <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>
                      </label>
                      <input
                        id={`${key}-client-secret`}
                        type="password"
                        value={cfg.clientSecret}
                        onChange={(e) => update(key, { clientSecret: e.target.value })}
                        placeholder="••••••••"
                        required
                        readOnly={!canEdit}
                        autoComplete="off"
                        style={inputStyle}
                        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                      />
                      <p style={helpStyle}>{t(`loginProviders.${key}SecretHelp`)}</p>
                    </div>
                  </div>

                  {/* Redirect URI — read-only, copyable: this exact URL goes
                      into the provider's console, so it is shown, not typed. */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor={`${key}-redirect`} style={labelStyle}>
                      {t('loginProviders.redirectUri')}
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        id={`${key}-redirect`}
                        type="text"
                        value={redirectFor(key)}
                        readOnly
                        style={{ ...inputStyle, flex: 1, minWidth: 0, color: 'var(--muted-text)' }}
                      />
                      <button
                        type="button"
                        aria-label={t('loginProviders.copyRedirect')}
                        title={t('loginProviders.copyRedirect')}
                        onClick={() => {
                          navigator.clipboard?.writeText(redirectFor(key)).then(() => {
                            showToast('success', t('loginProviders.copied'));
                          });
                        }}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          border: '1px solid var(--input-border)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'border-color 0.15s, color 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    </div>
                    <p style={helpStyle}>{t('loginProviders.redirectUriHelp')}</p>
                  </div>

                  {/* Instruction steps — the click-path for this provider's
                      console, same accent box as the other settings pages. */}
                  <div
                    style={{
                      backgroundColor: 'var(--accent-light)',
                      border: '1px solid var(--accent)',
                      borderRadius: '10px',
                      padding: '1rem 1.25rem',
                      fontSize: '0.8125rem',
                      color: 'var(--accent)',
                      lineHeight: 1.6,
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                      {t(`loginProviders.${key}HowTo`)}
                    </strong>
                    <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.5rem' }}>
                      <li>{t(`loginProviders.${key}Step1`)}</li>
                      <li>{t(`loginProviders.${key}Step2`)}</li>
                      <li>{t(`loginProviders.${key}Step3`)}</li>
                      <li>{t(`loginProviders.${key}Step4`)}</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Buttons */}
        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingBottom: '2rem' }}>
            <button
              type="submit"
              disabled={saving}
              aria-label={t('common.save')}
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
              {saving ? <Spinner /> : t('common.save')}
            </button>
          </div>
        )}
      </form>

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
