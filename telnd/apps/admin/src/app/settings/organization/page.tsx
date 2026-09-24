'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';

interface OrganizationSettings {
  name: string;
  tagline: string;
  website: string;
  industry: string;
  about: string;
  address: string;
  phone: string;
  registrationNumber: string;
  taxNumber: string;
  vatNumber: string;
  foundedYear: string;
  facebook: string;
  linkedin: string;
  youtube: string;
  twitter: string;
  instagram: string;
  tiktok: string;
  whatsapp: string;
}

const defaultSettings: OrganizationSettings = {
  name: '',
  tagline: '',
  website: '',
  industry: '',
  about: '',
  address: '',
  phone: '',
  registrationNumber: '',
  taxNumber: '',
  vatNumber: '',
  foundedYear: '',
  facebook: '',
  linkedin: '',
  youtube: '',
  twitter: '',
  instagram: '',
  tiktok: '',
  whatsapp: '',
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

export default function OrganizationSettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<OrganizationSettings>(defaultSettings);
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
        if (res.success && res.data.organization) {
          const o = res.data.organization as Partial<OrganizationSettings>;
          setSettings({ ...defaultSettings, ...o });
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
      await api.put('/api/settings', { organization: settings });
      showToast('success', t('organization.saved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSaving(false);
    }
  }

  function update(field: keyof OrganizationSettings, value: string) {
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
        {t('organization.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('organization.description')}
      </p>

      <form onSubmit={handleSubmit}>
        {/* ── Company Details ── */}
        <Section title="Company Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label={t('organization.name')}
              value={settings.name}
              onChange={(v) => update('name', v)}
              placeholder="TELND"
              required
            />
            <Input
              label={t('organization.tagline')}
              value={settings.tagline}
              onChange={(v) => update('tagline', v)}
              placeholder="Connecting talent with opportunity"
            />
            <Input
              label={t('organization.website')}
              value={settings.website}
              onChange={(v) => update('website', v)}
              placeholder="https://telnd.com"
              type="url"
            />
            <Input
              label={t('organization.industry')}
              value={settings.industry}
              onChange={(v) => update('industry', v)}
              placeholder="Technology"
            />
          </div>
        </Section>

        {/* ── About ── */}
        <Section title="About">
          <Textarea
            label={t('organization.about')}
            value={settings.about}
            onChange={(v) => update('about', v)}
            placeholder="A brief description of your organization"
            rows={3}
            helperText="Shown on your public site"
          />
        </Section>

        {/* ── Contact & Address ── */}
        <Section title="Contact & Address">
          <Textarea
            label={t('organization.address')}
            value={settings.address}
            onChange={(v) => update('address', v)}
            placeholder="House 12, Road 5, Dhanmondi, Dhaka"
            rows={2}
          />
          <Input
            label={t('organization.phone')}
            value={settings.phone}
            onChange={(v) => update('phone', v)}
            placeholder="+880 1XXX-XXXXXX"
            type="tel"
          />
        </Section>

        {/* ── Legal & Registration ── */}
        <Section title="Legal & Registration">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label={t('organization.registrationNumber')}
              value={settings.registrationNumber}
              onChange={(v) => update('registrationNumber', v)}
              placeholder="TRAD/DNCC/00123/2024"
            />
            <Input
              label={t('organization.taxNumber')}
              value={settings.taxNumber}
              onChange={(v) => update('taxNumber', v)}
              placeholder="123456789012"
            />
            <Input
              label={t('organization.vatNumber')}
              value={settings.vatNumber}
              onChange={(v) => update('vatNumber', v)}
              placeholder="000000000000"
            />
            <Input
              label={t('organization.foundedYear')}
              value={settings.foundedYear}
              onChange={(v) => update('foundedYear', v)}
              placeholder="2020"
            />
          </div>
        </Section>

        {/* ── Social Links ── */}
        <Section title="Social Links">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label={t('organization.facebook')}
              value={settings.facebook}
              onChange={(v) => update('facebook', v)}
              placeholder="https://facebook.com/telnd"
              type="url"
            />
            <Input
              label={t('organization.linkedin')}
              value={settings.linkedin}
              onChange={(v) => update('linkedin', v)}
              placeholder="https://linkedin.com/company/telnd"
              type="url"
            />
            <Input
              label={t('organization.youtube')}
              value={settings.youtube}
              onChange={(v) => update('youtube', v)}
              placeholder="https://youtube.com/@telnd"
              type="url"
            />
            <Input
              label={t('organization.twitter')}
              value={settings.twitter}
              onChange={(v) => update('twitter', v)}
              placeholder="https://x.com/telnd"
              type="url"
            />
            <Input
              label={t('organization.instagram')}
              value={settings.instagram}
              onChange={(v) => update('instagram', v)}
              placeholder="https://instagram.com/telnd"
              type="url"
            />
            <Input
              label={t('organization.tiktok')}
              value={settings.tiktok}
              onChange={(v) => update('tiktok', v)}
              placeholder="https://tiktok.com/@telnd"
              type="url"
            />
            <Input
              label={t('organization.whatsapp')}
              value={settings.whatsapp}
              onChange={(v) => update('whatsapp', v)}
              placeholder="+880 1XXX-XXXXXX"
              type="tel"
            />
          </div>
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
