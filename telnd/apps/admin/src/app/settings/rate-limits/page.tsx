'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';

// §14.60 — Settings → Rate limits: the full per-endpoint editor plus the
// §14.59 send quotas (moved here from Gateway so all spend/abuse posture
// lives in one menu). The catalog endpoint serves the API registry — every
// key with its effective value, its default and its group — so this page
// never duplicates the table; labels translate by key with the registry's
// English label as the fallback for any key a translation doesn't know yet.

interface SendQuotaConfig {
  smsDaily: number;
  emailDaily: number;
}

interface CatalogItem {
  key: string;
  group: string;
  label: string;
  windowSec: number;
  max: number;
  defaultWindowSec: number;
  defaultMax: number;
  overridden: boolean;
}

const GROUPS = ['authentication', 'account', 'userSecurity', 'admin', 'public'] as const;
type Group = (typeof GROUPS)[number];

const WINDOW_MIN = 10;
const WINDOW_MAX = 86400;
const MAX_MIN = 1;
const MAX_MAX = 10000;

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
};

const smallInputStyle: React.CSSProperties = {
  ...inputStyle,
  height: '36px',
  textAlign: 'right',
};

const primaryButtonStyle = (busy: boolean): React.CSSProperties => ({
  minWidth: '110px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0 1.5rem',
  height: '40px',
  borderRadius: '8px',
  backgroundColor: busy ? 'var(--accent-hover)' : 'var(--accent)',
  color: '#fff',
  fontSize: '0.875rem',
  fontWeight: 600,
  border: 'none',
  cursor: busy ? 'not-allowed' : 'pointer',
  transition: 'background-color 0.15s',
});

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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      padding: '1.25rem 1.5rem',
      marginBottom: '1rem',
    }}>
      {children}
    </div>
  );
}

export default function RateLimitsPage() {
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<SendQuotaConfig>({ smsDaily: 100, emailDaily: 500 });
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [baseline, setBaseline] = useState<Record<string, { windowSec: number; max: number }>>({});
  const [savingQuota, setSavingQuota] = useState(false);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const { t } = useLanguage();
  const toastIdRef = useRef(0);

  interface ToastState {
    id: number;
    type: ToastType;
    message: string;
  }

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, catalogRes] = await Promise.all([
          api.get<{ success: boolean; data: Record<string, unknown> }>('/api/settings'),
          api.get<{ success: boolean; data: { items: CatalogItem[] } }>('/api/settings/rate-limits'),
        ]);
        const g = settingsRes.data.gateway as { sendQuota?: Partial<SendQuotaConfig> } | undefined;
        setQuota({
          smsDaily: g?.sendQuota?.smsDaily ?? 100,
          emailDaily: g?.sendQuota?.emailDaily ?? 500,
        });
        const catalogItems = catalogRes.data.items ?? [];
        setItems(catalogItems);
        setBaseline(
          Object.fromEntries(catalogItems.map((i) => [i.key, { windowSec: i.windowSec, max: i.max }])),
        );
      } catch (err) {
        if (err instanceof ApiError) showToast('error', err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  // Registry English label when the translation doesn't know the key yet —
  // never a raw `rateLimits.keys.…` string on screen.
  const itemLabel = useCallback(
    (item: CatalogItem): string => {
      const key = `rateLimits.keys.${item.key}`;
      const translated = t(key as never);
      return translated === key ? item.label : translated;
    },
    [t],
  );

  function updateItem(key: string, field: 'windowSec' | 'max', raw: string) {
    const v = raw === '' ? 0 : Math.floor(Number(raw));
    if (Number.isNaN(v)) return;
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: v } : i)));
  }

  const groupDirty = useCallback(
    (group: Group) =>
      items.some(
        (i) =>
          i.group === group &&
          (i.windowSec !== baseline[i.key]?.windowSec || i.max !== baseline[i.key]?.max),
      ),
    [items, baseline],
  );

  // §14.59: shallow merge keeps sms/payment untouched — the cap is read
  // fresh on every send, so the very next request honours a new value.
  async function saveQuota() {
    setSavingQuota(true);
    try {
      await api.put('/api/settings', { gateway: { sendQuota: quota } });
      showToast('success', t('rateLimits.saved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSavingQuota(false);
    }
  }

  async function saveGroup(group: Group) {
    const groupItems = items.filter((i) => i.group === group);
    for (const i of groupItems) {
      if (i.windowSec < WINDOW_MIN || i.windowSec > WINDOW_MAX) {
        showToast('error', t('rateLimits.invalidWindow', { name: itemLabel(i) }));
        return;
      }
      if (i.max < MAX_MIN || i.max > MAX_MAX) {
        showToast('error', t('rateLimits.invalidMax', { name: itemLabel(i) }));
        return;
      }
    }
    setSavingGroup(group);
    try {
      const payload: Record<string, { windowSec: number; max: number }> = {};
      for (const i of groupItems) payload[i.key] = { windowSec: i.windowSec, max: i.max };
      await api.put('/api/settings', { rateLimits: payload });
      setBaseline((prev) => ({ ...prev, ...payload }));
      showToast('success', t('rateLimits.saved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSavingGroup(null);
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>{t('common.loading')}</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('rateLimits.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('rateLimits.description')}
      </p>

      {/* ══ Category: Send quotas (§14.59, moved from Gateway) ══ */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
        {t('gateway.quotaCategory')}
      </h2>

      <Card>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', margin: '0 0 1rem' }}>
          {t('gateway.quotaDesc')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label
              htmlFor="quota-sms-daily"
              style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}
            >
              {t('gateway.quotaSmsDaily')}
            </label>
            <input
              id="quota-sms-daily"
              type="number"
              min={0}
              step={1}
              value={quota.smsDaily}
              onChange={(e) => {
                const raw = e.target.value;
                const v = raw === '' ? 0 : Math.max(0, Math.floor(Number(raw)));
                if (!Number.isNaN(v)) setQuota((q) => ({ ...q, smsDaily: v }));
              }}
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
            />
          </div>
          <div>
            <label
              htmlFor="quota-email-daily"
              style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}
            >
              {t('gateway.quotaEmailDaily')}
            </label>
            <input
              id="quota-email-daily"
              type="number"
              min={0}
              step={1}
              value={quota.emailDaily}
              onChange={(e) => {
                const raw = e.target.value;
                const v = raw === '' ? 0 : Math.max(0, Math.floor(Number(raw)));
                if (!Number.isNaN(v)) setQuota((q) => ({ ...q, emailDaily: v }));
              }}
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
            />
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={saveQuota}
          disabled={savingQuota}
          aria-label={t('common.save')}
          style={primaryButtonStyle(savingQuota)}
        >
          {savingQuota ? <Spinner /> : t('common.save')}
        </button>
      </div>

      {/* ══ Category: Endpoint limits (§14.60) ══ */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', marginTop: '1.75rem' }}>
        {t('rateLimits.limitsCategory')}
      </h2>

      {GROUPS.map((group) => {
        const groupItems = items.filter((i) => i.group === group);
        if (groupItems.length === 0) return null;
        const dirty = groupDirty(group);
        const saving = savingGroup === group;
        return (
          <Card key={group}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {t(`rateLimits.groups.${group}` as never)}
              </h3>
              <button
                type="button"
                onClick={() => void saveGroup(group)}
                disabled={!dirty || saving}
                aria-label={t('common.save')}
                style={primaryButtonStyle(!dirty || saving)}
              >
                {saving ? <Spinner /> : t('common.save')}
              </button>
            </div>

            {/* Column headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 150px 150px',
                gap: '1rem',
                padding: '0 0 0.5rem',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--muted-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              <div>{t('rateLimits.endpointCol')}</div>
              <div style={{ textAlign: 'right' }}>{t('rateLimits.windowCol')}</div>
              <div style={{ textAlign: 'right' }}>{t('rateLimits.maxCol')}</div>
            </div>

            {groupItems.map((i, idx) => {
              const label = itemLabel(i);
              const custom = i.windowSec !== i.defaultWindowSec || i.max !== i.defaultMax;
              return (
                <div
                  key={i.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 150px 150px',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '0.75rem 0',
                    borderBottom: idx === groupItems.length - 1 ? 'none' : '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {label}
                      {custom && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--accent)', backgroundColor: 'var(--accent-bg, transparent)', border: '1px solid var(--accent)', borderRadius: '999px', padding: '0 0.5rem' }}>
                          {t('rateLimits.customBadge')}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.125rem' }}>
                      {t('rateLimits.defaultHint', { max: i.defaultMax, window: i.defaultWindowSec })}
                    </div>
                  </div>
                  <input
                    id={`rl-window-${i.key}`}
                    type="number"
                    min={WINDOW_MIN}
                    max={WINDOW_MAX}
                    step={1}
                    value={i.windowSec}
                    aria-label={`${label} — ${t('rateLimits.windowCol')}`}
                    onChange={(e) => updateItem(i.key, 'windowSec', e.target.value)}
                    style={smallInputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                  />
                  <input
                    id={`rl-max-${i.key}`}
                    type="number"
                    min={MAX_MIN}
                    max={MAX_MAX}
                    step={1}
                    value={i.max}
                    aria-label={`${label} — ${t('rateLimits.maxCol')}`}
                    onChange={(e) => updateItem(i.key, 'max', e.target.value)}
                    style={smallInputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                  />
                </div>
              );
            })}
          </Card>
        );
      })}

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
