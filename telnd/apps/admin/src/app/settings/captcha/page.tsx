'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';

interface CaptchaSettings {
  enabled: boolean;
  siteKey: string;
  secretKey: string;
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

export default function CaptchaSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CaptchaSettings>({ enabled: false, siteKey: '', secretKey: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const { t } = useLanguage();
  const toastIdRef = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ success: boolean; data: Record<string, unknown> }>('/api/settings');
        if (res.success && res.data.captcha) {
          const c = res.data.captcha as Partial<CaptchaSettings>;
          setSettings({ enabled: c.enabled ?? false, siteKey: c.siteKey ?? '', secretKey: c.secretKey ?? '' });
        }
      } catch (err) {
        if (err instanceof ApiError && err.status !== 404) {
          showToast('error', err.message);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put('/api/settings', { captcha: settings });
      showToast('success', t('captcha.saved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>{t('smtp.loading')}</div>;
  }

  const inputStyle = {
    width: '100%',
    height: '40px',
    borderRadius: '8px',
    border: '1px solid var(--input-border)',
    padding: '0 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-main)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('captcha.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('captcha.description')}
      </p>

      <form onSubmit={handleSubmit}>
        {/* Enable/Disable Toggle */}
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Enable CAPTCHA
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                When enabled, visitors must solve the CAPTCHA challenge on login and signup
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              aria-label="Enable CAPTCHA"
              onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
              style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', backgroundColor: settings.enabled ? 'var(--accent)' : 'var(--input-border)', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0, }}
            >
              <span style={{ position: 'absolute', top: '3px', left: settings.enabled ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', }} />
            </button>
          </div>
        </div>

        {settings.enabled && (
          <>
            {/* ── Keys ── */}
            <Section title="API Keys">
              {/* Site Key */}
              <div style={{ maxWidth: '640px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                  {t('captcha.siteKey')}
                </label>
                <input
                  type="text"
                  value={settings.siteKey}
                  onChange={(e) => setSettings(s => ({ ...s, siteKey: e.target.value }))}
                  placeholder="0x4AAAAA..."
                  style={inputStyle}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                  {t('captcha.siteKeyHelp')}
                </p>
              </div>

              {/* Secret Key */}
              <div style={{ marginTop: '1rem', maxWidth: '640px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                  {t('captcha.secretKey')}
                </label>
                <input
                  type="password"
                  value={settings.secretKey}
                  onChange={(e) => setSettings(s => ({ ...s, secretKey: e.target.value }))}
                  placeholder="Enter your secret key"
                  style={inputStyle}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                  {t('captcha.secretKeyHelp')}
                </p>
              </div>
            </Section>

            {/* Info Box */}
            <div style={{
              backgroundColor: 'var(--accent-light)',
              border: '1px solid var(--accent)',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              marginBottom: '1rem',
              fontSize: '0.8125rem',
              color: 'var(--accent)',
              lineHeight: 1.6,
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                {t('captcha.howToConnect')}
              </strong>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.5rem' }}>
                <li>{t('captcha.step2')}</li>
                <li>{t('captcha.step3')}</li>
                <li>{t('captcha.step4')}</li>
                <li>{t('captcha.step5')}</li>
              </ol>
            </div>
          </>
        )}

        {/* ── Submit ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingBottom: '2rem' }}>
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
              height: '40px',
              borderRadius: '8px',
              backgroundColor: saving ? 'var(--accent-hover)' : 'var(--accent)',
              color: '#fff',
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      padding: '1.25rem 1.5rem',
      marginBottom: '1rem',
    }}>
      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
