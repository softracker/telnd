'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';

interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export default function SmtpSettingsPage() {
  const [settings, setSettings] = useState<SmtpSettings>({ host: '', port: 587, secure: false, user: '', pass: '', from: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ success: boolean; data: Record<string, unknown> }>('/api/settings');
        if (res.success && res.data.smtp) {
          const s = res.data.smtp as Partial<SmtpSettings>;
          setSettings({
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
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    setTestResult(null);

    try {
      await api.put('/api/settings', { smtp: settings });
      setMessage(t('smtp.saved'));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('common.failed'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    setError('');

    try {
      await api.post('/api/settings/smtp/test', settings);
      setTestResult({ ok: true, msg: t('smtp.testingSuccess') });
    } catch (err) {
      if (err instanceof ApiError) {
        setTestResult({ ok: false, msg: err.message });
      } else {
        setTestResult({ ok: false, msg: t('smtp.testingFailed') });
      }
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
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        {t('smtp.description')}
      </p>

      {message && (
        <div style={{ borderRadius: '8px', backgroundColor: 'var(--success-bg)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--success-text)', marginBottom: '1rem' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ borderRadius: '8px', backgroundColor: 'var(--error-bg)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--error-text)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {testResult && (
        <div style={{
          borderRadius: '8px',
          backgroundColor: testResult.ok ? 'var(--success-bg)' : 'var(--error-bg)',
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
          color: testResult.ok ? 'var(--success-text)' : 'var(--error-text)',
          marginBottom: '1rem',
        }}>
          {testResult.msg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
        {/* Host */}
        <div>
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
        <div style={{ display: 'flex', gap: '1rem' }}>
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

        {/* Username */}
        <div>
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
        <div>
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
        <div>
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

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !settings.host || !settings.port}
            style={{
              flex: 1,
              height: '40px',
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
            {testing ? t('smtp.testing') : t('smtp.testConnection')}
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 1,
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
            {saving ? t('smtp.saving') : t('smtp.saveSettings')}
          </button>
        </div>
      </form>
    </div>
  );
}
