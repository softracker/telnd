'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import ImageUploader from '@/components/image-uploader';
import Toast, { type ToastType } from '@/components/toast';

interface GeneralSettings {
  favicon: string;
  primaryLogoLight: string;
  primaryLogoDark: string;
  secondaryLogoLight: string;
  secondaryLogoDark: string;
  siteUrl: string;
  applicationName: string;
  siteDescription: string;
  metaKeywords: string;
  metaDescription: string;
  ogImage: string;
  contactEmail: string;
  supportEmail: string;
  copyrightText: string;
}

const defaultSettings: GeneralSettings = {
  favicon: '',
  primaryLogoLight: '',
  primaryLogoDark: '',
  secondaryLogoLight: '',
  secondaryLogoDark: '',
  siteUrl: '',
  applicationName: '',
  siteDescription: '',
  metaKeywords: '',
  metaDescription: '',
  ogImage: '',
  contactEmail: '',
  supportEmail: '',
  copyrightText: '',
};

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

export default function GeneralSettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
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
        if (res.success && res.data.general) {
          const g = res.data.general as Partial<GeneralSettings>;
          setSettings({ ...defaultSettings, ...g });
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
      await api.put('/api/settings', { general: settings });
      showToast('success', t('general.saved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof GeneralSettings, value: string) {
    setSettings(prev => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)' }}>
        {t('smtp.loading')}
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('general.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('general.description')}
      </p>

      <form onSubmit={handleSubmit}>
        {/* ── Branding Section ── */}
        <Section title="Branding">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <ImageUploader
              label={t('general.favicon')}
              value={settings.favicon}
              folder="settings/favicon"
              onUpload={(url) => update('favicon', url)}
              onRemove={() => update('favicon', '')}
              accept="image/x-icon,image/png,image/svg+xml"
              helperText="ICO, PNG, or SVG. Recommended: 32x32px"
            />
            <ImageUploader
              label={t('general.primaryLogoLight')}
              value={settings.primaryLogoLight}
              folder="settings/logo-primary-light"
              maxWidth={400}
              maxHeight={100}
              onUpload={(url) => update('primaryLogoLight', url)}
              onRemove={() => update('primaryLogoLight', '')}
              helperText="PNG or SVG. Recommended: 200x50px"
            />
            <ImageUploader
              label={t('general.primaryLogoDark')}
              value={settings.primaryLogoDark}
              folder="settings/logo-primary-dark"
              maxWidth={400}
              maxHeight={100}
              onUpload={(url) => update('primaryLogoDark', url)}
              onRemove={() => update('primaryLogoDark', '')}
              helperText="PNG or SVG. Recommended: 200x50px"
            />
            <ImageUploader
              label={t('general.secondaryLogoLight')}
              value={settings.secondaryLogoLight}
              folder="settings/logo-secondary-light"
              maxWidth={200}
              maxHeight={200}
              onUpload={(url) => update('secondaryLogoLight', url)}
              onRemove={() => update('secondaryLogoLight', '')}
              helperText="PNG or SVG. Square format recommended"
            />
            <ImageUploader
              label={t('general.secondaryLogoDark')}
              value={settings.secondaryLogoDark}
              folder="settings/logo-secondary-dark"
              maxWidth={200}
              maxHeight={200}
              onUpload={(url) => update('secondaryLogoDark', url)}
              onRemove={() => update('secondaryLogoDark', '')}
              helperText="PNG or SVG. Square format recommended"
            />
            <ImageUploader
              label={t('general.ogImage')}
              value={settings.ogImage}
              folder="settings/og-image"
              maxWidth={1200}
              maxHeight={630}
              onUpload={(url) => update('ogImage', url)}
              onRemove={() => update('ogImage', '')}
              helperText="Social sharing image. Recommended: 1200x630px"
            />
          </div>
        </Section>

        {/* ── General Info Section ── */}
        <Section title="General Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label={t('general.applicationName')}
              value={settings.applicationName}
              onChange={(v) => update('applicationName', v)}
              placeholder="TELND"
              required
            />
            <Input
              label={t('general.siteUrl')}
              value={settings.siteUrl}
              onChange={(v) => update('siteUrl', v)}
              placeholder="https://telnd.com"
              type="url"
            />
          </div>
          <Textarea
            label={t('general.siteDescription')}
            value={settings.siteDescription}
            onChange={(v) => update('siteDescription', v)}
            placeholder="A brief description of your site"
            rows={2}
          />
        </Section>

        {/* ── SEO Section ── */}
        <Section title="SEO & Meta">
          <Textarea
            label={t('general.metaKeywords')}
            value={settings.metaKeywords}
            onChange={(v) => update('metaKeywords', v)}
            placeholder="keyword1, keyword2, keyword3"
            rows={2}
            helperText="Comma-separated keywords for search engines"
          />
          <Textarea
            label={t('general.metaDescription')}
            value={settings.metaDescription}
            onChange={(v) => update('metaDescription', v)}
            placeholder="A compelling description for search engine results"
            rows={3}
            helperText="Recommended: 150-160 characters"
          />
        </Section>

        {/* ── Contact Section ── */}
        <Section title="Contact & Legal">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label={t('general.contactEmail')}
              value={settings.contactEmail}
              onChange={(v) => update('contactEmail', v)}
              placeholder="contact@example.com"
              type="email"
            />
            <Input
              label={t('general.supportEmail')}
              value={settings.supportEmail}
              onChange={(v) => update('supportEmail', v)}
              placeholder="support@example.com"
              type="email"
            />
          </div>
          <Input
            label={t('general.copyrightText')}
            value={settings.copyrightText}
            onChange={(v) => update('copyrightText', v)}
            placeholder="2024 Your Company. All rights reserved."
          />
        </Section>

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

function Input({ label, value, onChange, placeholder, type = 'text', required = false, helperText }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; required?: boolean; helperText?: string;
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

function Textarea({ label, value, onChange, placeholder, rows = 3, helperText }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  rows?: number; helperText?: string;
}) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%',
          borderRadius: '8px',
          border: '1px solid var(--input-border)',
          padding: '0.625rem 0.75rem',
          fontSize: '0.875rem',
          outline: 'none',
          backgroundColor: 'var(--input-bg)',
          color: 'var(--text-main)',
          resize: 'vertical',
          transition: 'border-color 0.15s',
          fontFamily: 'inherit',
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
