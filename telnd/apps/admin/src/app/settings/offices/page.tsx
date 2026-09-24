'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';

interface Office {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  hours: string;
  isHeadquarters: boolean;
  visible: boolean;
}

type OfficeForm = Omit<Office, 'id'>;

const emptyForm: OfficeForm = {
  name: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
  hours: '',
  isHeadquarters: false,
  visible: true,
};

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
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

export default function OfficesSettingsPage() {
  const { t } = useLanguage();
  const [offices, setOffices] = useState<Office[]>([]);
  const [form, setForm] = useState<OfficeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
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
        if (res.success && Array.isArray(res.data.offices)) {
          const raw = res.data.offices as Array<Partial<Office>>;
          setOffices(raw.map((o) => ({
            ...emptyForm,
            ...o,
            id: o.id || newId(),
            // Offices saved before visibility existed default to visible.
            visible: o.visible !== false,
          })));
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

  // Offices are managed locally (add / edit / remove) and only reach the
  // server when the page's Save button is pressed — same as every other
  // settings page: nothing is persisted until Save.
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/settings', { offices });
      showToast('success', t('offices.saved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(true);
  }

  function openEdit(office: Office) {
    const { id, ...fields } = office;
    setForm({ ...emptyForm, ...fields });
    setEditingId(id);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function update(field: keyof OfficeForm, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Adds the form as a new office or replaces the one being edited. All
  // changes stay local until the page's Save button persists the list.
  function handleFormConfirm(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    const targetId = editingId ?? newId();
    const entry: Office = { ...form, name, id: targetId };

    setOffices(prev => {
      const base = editingId
        ? prev.map(o => (o.id === editingId ? entry : o))
        : [...prev, entry];
      // Only one office can be the head office at a time.
      return form.isHeadquarters
        ? base.map(o => (o.id === targetId ? o : { ...o, isHeadquarters: false }))
        : base;
    });
    closeForm();
  }

  function removeOffice(id: string) {
    setOffices(prev => prev.filter(o => o.id !== id));
    if (editingId === id) closeForm();
  }

  function toggleVisible(id: string) {
    setOffices(prev => prev.map(o => (o.id === id ? { ...o, visible: !o.visible } : o)));
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
        {t('offices.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('offices.description')}
      </p>

      <form onSubmit={handleSubmit}>
        {/* ── Locations list ── */}
        <Section title="Locations">
          {offices.length === 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', marginBottom: '0.75rem' }}>
              {t('offices.noOffices')}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {offices.map(office => (
              <div
                key={office.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--input-bg)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {office.name}
                    </span>
                    {office.isHeadquarters && (
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: 'var(--accent)',
                        backgroundColor: 'var(--bg-hover)',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '999px',
                      }}>
                        {t('offices.headOffice')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    {[office.address, office.city, office.country].filter(Boolean).join(', ') || '\u2014'}
                  </div>
                  {[office.hours, office.phone, office.email].filter(Boolean).length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.125rem' }}>
                      {[office.hours, office.phone, office.email].filter(Boolean).join(' \u00b7 ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: office.visible ? 'var(--accent)' : 'var(--muted-text)',
                    minWidth: '42px',
                    textAlign: 'right',
                  }}>
                    {office.visible ? t('offices.visible') : t('offices.hidden')}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={office.visible}
                    aria-label={office.name}
                    onClick={() => toggleVisible(office.id)}
                    style={{
                      width: '48px',
                      height: '26px',
                      borderRadius: '13px',
                      border: 'none',
                      padding: 0,
                      backgroundColor: office.visible ? 'var(--accent)' : 'var(--input-border)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '3px',
                      left: office.visible ? '25px' : '3px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                  <button type="button" onClick={() => openEdit(office)} style={rowButtonStyle}>
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOffice(office.id)}
                    style={{ ...rowButtonStyle, color: 'var(--error-text, #ef4444)' }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={openAdd}
            style={{
              width: '100%',
              marginTop: '0.75rem',
              padding: '0.625rem',
              borderRadius: '8px',
              border: '1px dashed var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--accent)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'border-color 0.15s, background-color 0.15s',
            }}
          >
            + {t('offices.add')}
          </button>
        </Section>

        {/* ── Add / edit office form ── */}
        {formOpen && (
          <Section title={editingId ? t('offices.editOffice') : t('offices.add')}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label={t('offices.name')}
                value={form.name}
                onChange={(v) => update('name', v)}
                placeholder="Headquarters"
                required
              />
              <Input
                label={t('offices.phone')}
                value={form.phone}
                onChange={(v) => update('phone', v)}
                placeholder="+880 1XXX-XXXXXX"
                type="tel"
              />
              <Input
                label={t('offices.city')}
                value={form.city}
                onChange={(v) => update('city', v)}
                placeholder="Dhaka"
              />
              <Input
                label={t('offices.country')}
                value={form.country}
                onChange={(v) => update('country', v)}
                placeholder="Bangladesh"
              />
              <Input
                label={t('offices.email')}
                value={form.email}
                onChange={(v) => update('email', v)}
                placeholder="office@example.com"
                type="email"
              />
              <Input
                label={t('offices.hours')}
                value={form.hours}
                onChange={(v) => update('hours', v)}
                placeholder="Sat-Thu, 9:00 AM - 5:00 PM"
              />
            </div>
            <Textarea
              label={t('offices.address')}
              value={form.address}
              onChange={(v) => update('address', v)}
              placeholder="House 12, Road 5, Dhanmondi, Dhaka"
              rows={2}
            />
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={form.isHeadquarters}
                  onChange={(e) => update('isHeadquarters', e.target.checked)}
                  style={checkboxStyle}
                />
                {t('offices.headOffice')}
              </label>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={(e) => update('visible', e.target.checked)}
                  style={checkboxStyle}
                />
                {t('offices.visible')}
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={closeForm}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleFormConfirm}
                disabled={!form.name.trim()}
                style={{
                  minWidth: '110px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: form.name.trim() ? 'var(--accent)' : 'var(--accent-hover)',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: form.name.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {editingId ? t('offices.update') : t('offices.add')}
              </button>
            </div>
          </Section>
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

const rowButtonStyle: React.CSSProperties = {
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-main)',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: 'var(--label-text)',
  cursor: 'pointer',
};

const checkboxStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  accentColor: 'var(--accent)',
  cursor: 'pointer',
};

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
