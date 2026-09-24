'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';

interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
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

export default function SmtpSettingsPage() {
  const [settings, setSettings] = useState<SmtpSettings>({ enabled: false, host: '', port: 587, secure: false, user: '', pass: '', from: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
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
        if (res.success && res.data.smtp) {
          const s = res.data.smtp as Partial<SmtpSettings>;
          setSettings({
            enabled: s.enabled ?? false,
            host: s.host ?? '',
            port: s.port ?? 587,
            secure: s.secure ?? false,
            user: s.user ?? '',
            pass: s.pass ?? '',
            from: s.from ?? '',
          });
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
      await api.put('/api/settings', { smtp: settings });
      showToast('success', t('smtp.saved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);

    try {
      await api.post('/api/settings/smtp/test', settings);
      showToast('success', t('smtp.testingSuccess'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('smtp.testingFailed'));
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>{t('smtp.loading')}</div>;
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
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('smtp.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('smtp.description')}
      </p>

      <form onSubmit={handleSubmit}>
        {/* Enable/Disable Toggle */}
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Enable SMTP
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                When enabled, the system will send emails through this SMTP server
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.enabled}
              aria-label="Enable SMTP"
              onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
              style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', backgroundColor: settings.enabled ? 'var(--accent)' : 'var(--input-border)', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0, }}
            >
              <span style={{ position: 'absolute', top: '3px', left: settings.enabled ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', }} />
            </button>
          </div>
        </div>

        {settings.enabled && (
          <>
          {/* ── Server ── */}
          <Section title="Server">
            {/* Host */}
            <div style={{ marginBottom: '1rem', maxWidth: '640px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                {t('smtp.host')}
              </label>
              <input
                type="text"
                value={settings.host}
                onChange={(e) => setSettings(s => ({ ...s, host: e.target.value }))}
                placeholder="smtp.gmail.com"
                required
                style={inputStyle}
              />
            </div>

            {/* Port + Secure toggle */}
            <div style={{ display: 'flex', gap: '1rem', maxWidth: '640px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                  {t('smtp.port')}
                </label>
                <input
                  type="number"
                  value={settings.port}
                  onChange={(e) => setSettings(s => ({ ...s, port: Number(e.target.value) }))}
                  min={1}
                  max={65535}
                  required
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '0.375rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.secure}
                    onClick={() => setSettings(s => ({ ...s, secure: !s.secure }))}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      backgroundColor: settings.secure ? 'var(--accent)' : 'var(--disabled-bg)',
                      transition: 'background-color 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      left: settings.secure ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--card-bg)',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)' }}>
                    {t('smtp.ssl')}
                  </span>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Account ── */}
          <Section title="Account">
            {/* Username */}
            <div style={{ marginBottom: '1rem', maxWidth: '640px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                {t('smtp.username')} <span style={{ color: 'var(--muted-text)', fontWeight: 400 }}>{t('smtp.optional')}</span>
              </label>
              <input
                type="text"
                value={settings.user}
                onChange={(e) => setSettings(s => ({ ...s, user: e.target.value }))}
                placeholder="your@email.com"
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1rem', maxWidth: '640px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                {t('smtp.password')} <span style={{ color: 'var(--muted-text)', fontWeight: 400 }}>{t('smtp.optional')}</span>
              </label>
              <input
                type="password"
                value={settings.pass}
                onChange={(e) => setSettings(s => ({ ...s, pass: e.target.value }))}
                placeholder="Enter password or app password"
                style={inputStyle}
              />
            </div>

            {/* From Email */}
            <div style={{ maxWidth: '640px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                {t('smtp.fromEmail')}
              </label>
              <input
                type="email"
                value={settings.from}
                onChange={(e) => setSettings(s => ({ ...s, from: e.target.value }))}
                placeholder="noreply@telnd.com"
                required
                style={inputStyle}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                {t('smtp.fromHelp')}
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
              {t('smtp.howToConnect')}
            </strong>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.5rem' }}>
              <li>{t('smtp.step2')}</li>
              <li>{t('smtp.step3')}</li>
              <li>{t('smtp.step4')}</li>
              <li>{t('smtp.step5')}</li>
            </ol>
          </div>
          </>
        )}

        {/* ── Buttons ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingBottom: '2rem' }}>
          {settings.enabled && (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !settings.host || !settings.port}
              aria-label={t('smtp.testConnection')}
              style={{
                minWidth: '160px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '40px',
                padding: '0 1.25rem',
                borderRadius: '8px',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--accent)',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: '1px solid var(--accent)',
                cursor: testing ? 'not-allowed' : 'pointer',
                opacity: testing || !settings.host || !settings.port ? 0.6 : 1,
                transition: 'background-color 0.15s',
              }}
            >
              {testing ? <Spinner /> : t('smtp.testConnection')}
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            aria-label={t('smtp.saveSettings')}
            style={{
              minWidth: '150px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40px',
              padding: '0 1.25rem',
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
            {saving ? <Spinner /> : t('smtp.saveSettings')}
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
