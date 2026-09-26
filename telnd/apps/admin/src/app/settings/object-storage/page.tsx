'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';

interface R2Settings {
  enabled: boolean;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
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

export default function ObjectStoragePage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<R2Settings>({
    enabled: false, endpoint: '', accessKeyId: '', secretAccessKey: '', bucket: '', publicUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ success: boolean; data: Record<string, unknown> }>('/api/settings');
        if (res.success && res.data.r2) {
          const r = res.data.r2 as Partial<R2Settings>;
          setSettings({
            enabled: r.enabled ?? false,
            endpoint: r.endpoint ?? '',
            accessKeyId: r.accessKeyId ?? '',
            secretAccessKey: r.secretAccessKey ?? '',
            bucket: r.bucket ?? '',
            publicUrl: r.publicUrl ?? '',
          });
        }
      } catch (err) {
        if (err instanceof ApiError && err.status !== 404) showToast('error', err.message);
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
      await api.put('/api/settings', { r2: settings });
      showToast('success', t('objectStorage.saved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await api.post<{ success: boolean; data?: { message?: string } }>('/api/settings/r2/test', settings);
      if (res.success) {
        showToast('success', res.data?.message || t('objectStorage.testSuccess'));
      } else {
        showToast('warning', t('objectStorage.testFailed'));
      }
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('objectStorage.testFailed'));
    } finally {
      setTesting(false);
    }
  }

  function update(field: keyof R2Settings, value: string | boolean) {
    setSettings(prev => ({ ...prev, [field]: value }));
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

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        Cloudflare R2 Object Storage
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Configure Cloudflare R2 for storing uploaded images and files. Images are automatically converted to WebP format.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Enable/Disable Toggle */}
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Enable Object Storage
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                When enabled, uploaded images will be stored in your Cloudflare R2 bucket
              </p>
            </div>
            <button
              type="button"
              onClick={() => update('enabled', !settings.enabled)}
              style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', backgroundColor: settings.enabled ? 'var(--accent)' : 'var(--input-border)', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0, }}
            >
              <span style={{ position: 'absolute', top: '3px', left: settings.enabled ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', }} />
            </button>
          </div>
        </div>

        {settings.enabled && (
          <>
            {/* Connection Settings */}
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
                Connection Settings
              </h3>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                  R2 Endpoint <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>
                </label>
                <input
                  type="url"
                  value={settings.endpoint}
                  onChange={(e) => update('endpoint', e.target.value)}
                  placeholder="https://<account-id>.r2.cloudflarestorage.com"
                  required
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                  Found in Cloudflare Dashboard &gt; R2 &gt; Overview &gt; S3 API
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                    Access Key ID <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={settings.accessKeyId}
                    onChange={(e) => update('accessKeyId', e.target.value)}
                    placeholder="Your R2 access key ID"
                    required
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                    Found in Cloudflare Dashboard &gt; R2 &gt; API Keys
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                    Secret Access Key <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={settings.secretAccessKey}
                    onChange={(e) => update('secretAccessKey', e.target.value)}
                    placeholder="Your R2 secret access key"
                    required
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                    Same location as the Access Key ID above
                  </p>
                </div>
              </div>
            </div>

            {/* Bucket Settings */}
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
                Bucket Settings
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                    Bucket Name <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={settings.bucket}
                    onChange={(e) => update('bucket', e.target.value)}
                    placeholder="my-bucket"
                    required
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                    Your bucket name from Cloudflare Dashboard
                  </p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                    Public URL <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>
                  </label>
                  <input
                    type="url"
                    value={settings.publicUrl}
                    onChange={(e) => update('publicUrl', e.target.value)}
                    placeholder="https://pub-xxx.r2.dev"
                    required
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
                    The public domain for your R2 bucket (R2.dev subdomain or custom domain)
                  </p>
                </div>
              </div>
            </div>

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
                {t('objectStorage.howToConnect')}
              </strong>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.5rem' }}>
                <li>{t('objectStorage.step1')}</li>
                <li>{t('objectStorage.step2')}</li>
                <li>{t('objectStorage.step3')}</li>
                <li>{t('objectStorage.step4')}</li>
                <li>{t('objectStorage.step5')}</li>
              </ol>
            </div>
          </>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingBottom: '2rem' }}>
          {settings.enabled && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              aria-label={t('objectStorage.testConnection')}
              style={{ minWidth: '150px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.625rem 1.25rem', borderRadius: '8px', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 500, border: '1px solid var(--input-border)', cursor: testing ? 'not-allowed' : 'pointer', transition: 'all 0.15s', }}
            >
              {testing ? <Spinner /> : t('objectStorage.testConnection')}
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            aria-label={t('common.save')}
            style={{ minWidth: '110px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.625rem 1.5rem', borderRadius: '8px', backgroundColor: saving ? 'var(--accent-hover)' : 'var(--accent)', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', transition: 'background-color 0.15s', }}
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
