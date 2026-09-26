'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';

interface AlphaConfig {
  enabled: boolean;
  apiKey: string;
}

interface SslCommerzeConfig {
  enabled: boolean;
  storeId: string;
  storePassword: string;
  sandbox: boolean;
}

interface GatewayConfig {
  sms: { alphaNet: AlphaConfig };
  payment: { sslcommerz: SslCommerzeConfig };
}

const DEFAULT_CONFIG: GatewayConfig = {
  sms: { alphaNet: { enabled: false, apiKey: '' } },
  payment: { sslcommerz: { enabled: false, storeId: '', storePassword: '', sandbox: true } },
};

interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

interface BalanceState {
  status: 'idle' | 'loading' | 'ok' | 'error';
  /** Last fetched value — kept visible while a refresh is in flight. */
  value?: string | null;
  message?: string;
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

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={spinning ? { animation: 'spin 0.7s linear infinite' } : undefined}
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
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
};

const secretInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'monospace',
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

export default function GatewaySettingsPage() {
  const [config, setConfig] = useState<GatewayConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [savingSms, setSavingSms] = useState(false);
  const [savingSsl, setSavingSsl] = useState(false);
  const [balance, setBalance] = useState<BalanceState>({ status: 'idle' });
  const [toast, setToast] = useState<ToastState | null>(null);
  const { t } = useLanguage();
  const toastIdRef = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  // Balance renders inline on the page (never as a toast), fetched on load
  // and on demand via the icon-only refresh button.
  const refreshBalance = useCallback(async (apiKey: string) => {
    setBalance((prev) => ({ status: 'loading', value: prev.value ?? null }));
    try {
      const res = await api.post<{ success: boolean; data: { balance: string | null } }>(
        '/api/settings/gateways/sms/alpha/balance',
        { apiKey },
      );
      setBalance({ status: 'ok', value: res.data?.balance ?? null });
    } catch (err) {
      setBalance({
        status: 'error',
        message: err instanceof ApiError ? err.message : t('gateway.balanceFailed'),
      });
    }
  }, [t]);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ success: boolean; data: Record<string, unknown> }>('/api/settings');
        const g = res.data.gateway as Partial<GatewayConfig> | undefined;
        const next: GatewayConfig = g
          ? {
              sms: {
                alphaNet: {
                  enabled: g.sms?.alphaNet?.enabled ?? false,
                  apiKey: g.sms?.alphaNet?.apiKey ?? '',
                },
              },
              payment: {
                sslcommerz: {
                  enabled: g.payment?.sslcommerz?.enabled ?? false,
                  storeId: g.payment?.sslcommerz?.storeId ?? '',
                  storePassword: g.payment?.sslcommerz?.storePassword ?? '',
                  sandbox: g.payment?.sslcommerz?.sandbox ?? true,
                },
              },
            }
          : DEFAULT_CONFIG;
        setConfig(next);
        // Page-load balance: only when the gateway is on and a key is saved.
        const key = next.sms.alphaNet.apiKey.trim();
        if (next.sms.alphaNet.enabled && key) {
          void refreshBalance(key);
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
  }, [showToast, refreshBalance]);

  async function saveSms() {
    setSavingSms(true);
    try {
      await api.put('/api/settings', { gateway: { sms: { alphaNet: config.sms.alphaNet } } });
      showToast('success', t('gateway.saved'));
      const key = config.sms.alphaNet.apiKey.trim();
      if (config.sms.alphaNet.enabled && key) {
        void refreshBalance(key);
      }
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSavingSms(false);
    }
  }

  async function saveSsl() {
    setSavingSsl(true);
    try {
      await api.put('/api/settings', { gateway: { payment: { sslcommerz: config.payment.sslcommerz } } });
      showToast('success', t('gateway.saved'));
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setSavingSsl(false);
    }
  }

  function toggleAlpha() {
    const nextEnabled = !config.sms.alphaNet.enabled;
    setConfig((c) => ({ ...c, sms: { alphaNet: { ...c.sms.alphaNet, enabled: nextEnabled } } }));
    const key = config.sms.alphaNet.apiKey.trim();
    if (nextEnabled && key && balance.status === 'idle') {
      void refreshBalance(key);
    }
  }

  function toggleSsl() {
    setConfig((c) => ({ ...c, payment: { sslcommerz: { ...c.payment.sslcommerz, enabled: !c.payment.sslcommerz.enabled } } }));
  }

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>{t('common.loading')}</div>;
  }

  const alpha = config.sms.alphaNet;
  const ssl = config.payment.sslcommerz;
  const alphaKey = alpha.apiKey.trim();

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('gateway.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {t('gateway.description')}
      </p>

      {/* ══ Category: SMS Gateway ══ */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
        {t('gateway.smsCategory')}
      </h2>

      {/* Enable card (object-storage pattern) */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {t('gateway.enableAlpha')}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
              {t('gateway.enableAlphaDesc')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={alpha.enabled}
            aria-label={t('gateway.enableAlpha')}
            onClick={toggleAlpha}
            style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', backgroundColor: alpha.enabled ? 'var(--accent)' : 'var(--input-border)', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0 }}
          >
            <span style={{ position: 'absolute', top: '3px', left: alpha.enabled ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>
      </Card>

      {/* Config card — hidden while disabled, exactly like object storage */}
      {alpha.enabled && (
        <Card>
          {/* API key */}
          <div style={{ maxWidth: '640px' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
              {t('gateway.apiKey')} <span style={{ color: 'var(--error-text, #ef4444)' }}>*</span>
            </label>
            <input
              type="password"
              value={alpha.apiKey}
              onChange={(e) => setConfig(c => ({ ...c, sms: { alphaNet: { ...c.sms.alphaNet, apiKey: e.target.value } } }))}
              placeholder="Enter your API key"
              autoComplete="off"
              style={secretInputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
              {t('gateway.apiKeyHelp')}
            </p>
          </div>

          {/* Balance — inline, loaded on page load; icon-only refresh beside it */}
          {alphaKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: '0.875rem' }}>
              {balance.status === 'loading' && !balance.value && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--muted-text)' }}>
                  <Spinner size={12} />
                  {t('gateway.balanceLoading')}
                </span>
              )}
              {balance.status === 'loading' && Boolean(balance.value) && (
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', opacity: 0.6 }}>
                  {t('gateway.balanceValue', { balance: balance.value! })}
                </span>
              )}
              {balance.status === 'ok' && (
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {balance.value ? t('gateway.balanceValue', { balance: balance.value }) : t('gateway.balanceSuccess')}
                </span>
              )}
              {balance.status === 'error' && (
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--error-text, #ef4444)' }}>
                  {balance.message}
                </span>
              )}
              {balance.status === 'idle' && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted-text)' }}>
                  {t('gateway.balanceLabel')}
                </span>
              )}
              <button
                type="button"
                onClick={() => void refreshBalance(alphaKey)}
                disabled={balance.status === 'loading'}
                aria-label={t('gateway.refreshBalance')}
                title={t('gateway.refreshBalance')}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid var(--input-border)',
                  backgroundColor: 'var(--input-bg)',
                  color: balance.status === 'loading' ? 'var(--muted-text)' : 'var(--text-muted)',
                  cursor: balance.status === 'loading' ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (balance.status !== 'loading') { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.borderColor = 'var(--input-border)'; }}
              >
                <RefreshIcon spinning={balance.status === 'loading'} />
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={saveSms}
          disabled={savingSms}
          aria-label={t('common.save')}
          style={primaryButtonStyle(savingSms)}
        >
          {savingSms ? <Spinner /> : t('common.save')}
        </button>
      </div>

      {/* ══ Category: Payment Gateway ══ */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', marginTop: '1.75rem' }}>
        {t('gateway.paymentCategory')}
      </h2>

      {/* Enable card */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {t('gateway.enableSsl')}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', marginTop: '0.25rem' }}>
              {t('gateway.enableSslDesc')}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={ssl.enabled}
            aria-label={t('gateway.enableSsl')}
            onClick={toggleSsl}
            style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', backgroundColor: ssl.enabled ? 'var(--accent)' : 'var(--input-border)', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0 }}
          >
            <span style={{ position: 'absolute', top: '3px', left: ssl.enabled ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>
      </Card>

      {/* Config card — hidden while disabled */}
      {ssl.enabled && (
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                {t('gateway.storeId')}
              </label>
              <input
                type="password"
                value={ssl.storeId}
                onChange={(e) => setConfig(c => ({ ...c, payment: { sslcommerz: { ...c.payment.sslcommerz, storeId: e.target.value } } }))}
                placeholder="Enter your store ID"
                autoComplete="off"
                style={secretInputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--label-text)', marginBottom: '0.375rem' }}>
                {t('gateway.storePassword')}
              </label>
              <input
                type="password"
                value={ssl.storePassword}
                onChange={(e) => setConfig(c => ({ ...c, payment: { sslcommerz: { ...c.payment.sslcommerz, storePassword: e.target.value } } }))}
                placeholder="Enter your store password"
                autoComplete="off"
                style={secretInputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
              />
            </div>
          </div>

          {/* Sandbox toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '1.25rem' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--label-text)' }}>
                {t('gateway.sandboxLabel')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.125rem' }}>
                {t('gateway.sandboxDesc')}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ssl.sandbox}
              aria-label={t('gateway.sandboxLabel')}
              onClick={() => setConfig(c => ({ ...c, payment: { sslcommerz: { ...c.payment.sslcommerz, sandbox: !c.payment.sslcommerz.sandbox } } }))}
              style={{ width: '48px', height: '26px', borderRadius: '13px', border: 'none', backgroundColor: ssl.sandbox ? 'var(--accent)' : 'var(--input-border)', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s', flexShrink: 0 }}
            >
              <span style={{ position: 'absolute', top: '3px', left: ssl.sandbox ? '25px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>
        </Card>
      )}

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={saveSsl}
          disabled={savingSsl}
          aria-label={t('common.save')}
          style={primaryButtonStyle(savingSsl)}
        >
          {savingSsl ? <Spinner /> : t('common.save')}
        </button>
      </div>

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
