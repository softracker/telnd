'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';

interface CaptchaSettings {
  enabled: boolean;
  siteKey: string;
  secretKey: string;
}

export default function CaptchaSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CaptchaSettings>({ enabled: false, siteKey: '', secretKey: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

    try {
      await api.put('/api/settings', { captcha: settings });
      setMessage('CAPTCHA settings saved successfully.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save settings.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading settings...</div>;
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
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5rem' }}>
        CAPTCHA Settings
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Configure Cloudflare Turnstile CAPTCHA for the login page. When enabled, users who fail 3+ login attempts will be required to solve a CAPTCHA.
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

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
        {/* Enable toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              backgroundColor: settings.enabled ? 'var(--accent)' : 'var(--disabled-bg)',
              transition: 'background-color 0.2s',
              flexShrink: 0,
            }}
          >
            <span style={{
              position: 'absolute',
              top: '2px',
              left: settings.enabled ? '22px' : '2px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'var(--card-bg)',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)' }}>
            {settings.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {/* Site Key */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
            Site Key
          </label>
          <input
            type="text"
            value={settings.siteKey}
            onChange={(e) => setSettings(s => ({ ...s, siteKey: e.target.value }))}
            placeholder="0x4AAAAA..."
            style={inputStyle}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
            Found in the Cloudflare Turnstile dashboard.
          </p>
        </div>

        {/* Secret Key */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
            Secret Key
          </label>
          <input
            type="password"
            value={settings.secretKey}
            onChange={(e) => setSettings(s => ({ ...s, secretKey: e.target.value }))}
            placeholder="Enter your secret key"
            style={inputStyle}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
            This is stored server-side and used for verification. Never share this key.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
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
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
