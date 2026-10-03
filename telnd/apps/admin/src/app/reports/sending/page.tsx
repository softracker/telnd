'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/components/language-provider';
import Toast, { type ToastType } from '@/components/toast';

// §14.60 — Reports → Sending analytics: daily SMS/email send statistics
// with graphs. Data is counts only (SendEvent rows carry no destination);
// days come zero-filled from the API in server-local calendar days.
// Charts are hand-rolled stacked-bar SVG — no chart dependency, every bar
// carries a <title> for hover values, and the whole chart is one labeled
// role="img" node for screen readers.

type SendCounts = { sent: number; failed: number; blockedDestination: number; blockedDaily: number };
interface DayStat { date: string; sms: SendCounts; email: SendCounts; }
interface StatsData {
  days: DayStat[];
  totals: { sms: SendCounts; email: SendCounts };
  rangeDays: number;
}

interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

const RANGES = [7, 30, 90];
const blockedTotal = (c: SendCounts): number => c.blockedDestination + c.blockedDaily;

const SEGMENTS = [
  { key: 'sent', color: 'var(--accent)' },
  { key: 'failed', color: 'var(--error-text)' },
  // No warning token in the theme; amber reads "stopped on purpose".
  { key: 'blocked', color: '#d97706' },
] as const;

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

/** Round a raw max up to a 1/2/5 × 10^k axis top. */
function niceCeil(v: number): number {
  if (v <= 1) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const unit = v / pow;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return nice * pow;
}

type BarDatum = { date: string; sent: number; failed: number; blocked: number };

function StackedBarChart({ series, ariaLabel }: { series: BarDatum[]; ariaLabel: string }) {
  const { t } = useLanguage();

  const W = 640;
  const H = 190;
  const padL = 40;
  const padR = 8;
  const padT = 8;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const peak = series.reduce((m, d) => Math.max(m, d.sent + d.failed + d.blocked), 0);
  const top = niceCeil(peak);
  const n = series.length;
  const slot = plotW / Math.max(1, n);
  const barW = Math.max(2, slot * 0.68);
  const yFor = (v: number): number => padT + plotH - (v / top) * plotH;
  const labelStep = Math.max(1, Math.ceil(n / 7));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={ariaLabel}
    >
      {/* gridlines + y labels */}
      {[0, top / 2, top].map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={yFor(v)} y2={yFor(v)} stroke="var(--border-color)" strokeWidth={1} />
          <text x={padL - 6} y={yFor(v) + 3} textAnchor="end" fontSize={10} fill="var(--muted-text)">
            {v}
          </text>
        </g>
      ))}

      {series.map((d, i) => {
        const x = padL + i * slot + (slot - barW) / 2;
        let cursor = padT + plotH;
        const totalsLine = t('sending.barTitle', {
          date: d.date,
          sent: d.sent,
          failed: d.failed,
          blocked: d.blocked,
        });
        return (
          <g key={d.date}>
            {([
              ['sent', d.sent],
              ['failed', d.failed],
              ['blocked', d.blocked],
            ] as const).map(([key, value]) => {
              if (value <= 0) return null;
              const h = (value / top) * plotH;
              cursor -= h;
              const color = SEGMENTS.find((s) => s.key === key)!.color;
              return <rect key={key} x={x} y={cursor} width={barW} height={h} fill={color} rx={1} />;
            })}
            {/* full-column hover target so tooltips don't need pixel-perfect aim */}
            <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent">
              <title>{totalsLine}</title>
            </rect>
            {(i % labelStep === 0 || i === n - 1) && (
              <text
                x={padL + i * slot + slot / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize={9}
                fill="var(--muted-text)"
              >
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Legend() {
  const { t } = useLanguage();
  const labels: Record<string, string> = {
    sent: t('sending.legendSent'),
    failed: t('sending.legendFailed'),
    blocked: t('sending.legendBlocked'),
  };
  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {SEGMENTS.map((s) => (
        <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: s.color, display: 'inline-block' }} />
          {labels[s.key]}
        </span>
      ))}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      padding: '1rem 1.125rem',
      minWidth: 0,
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.375rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.25rem' }}>
        {value}
      </div>
    </div>
  );
}

export default function SendingAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const { t } = useLanguage();
  const toastIdRef = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ id: ++toastIdRef.current, type, message });
  }, []);

  const loadStats = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: StatsData }>(`/api/admin/send-stats?days=${days}`);
      setStats(res.data);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : t('common.failed'));
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadStats(range);
  }, [range, loadStats]);

  const toSeries = (pick: (d: DayStat) => SendCounts): BarDatum[] =>
    (stats?.days ?? []).map((d) => {
      const c = pick(d);
      return { date: d.date, sent: c.sent, failed: c.failed, blocked: blockedTotal(c) };
    });

  const smsSeries = toSeries((d) => d.sms);
  const emailSeries = toSeries((d) => d.email);

  const today = stats?.days[stats.days.length - 1];
  const todaySms = today?.sms.sent ?? 0;
  const todayEmail = today?.email.sent ?? 0;
  const rangeSmsSent = stats?.totals.sms.sent ?? 0;
  const rangeEmailSent = stats?.totals.email.sent ?? 0;
  const rangeFailed = (stats ? stats.totals.sms.failed + stats.totals.email.failed : 0);
  const rangeBlocked = (stats ? blockedTotal(stats.totals.sms) + blockedTotal(stats.totals.email) : 0);

  const hasData = [...smsSeries, ...emailSeries].some((d) => d.sent + d.failed + d.blocked > 0);

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
        {t('sending.title')}
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        {t('sending.description')}
      </p>

      {/* Range switch */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => setRange(r)}
            style={{
              height: '32px',
              padding: '0 0.875rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s, color 0.15s',
              border: range === r ? '1px solid var(--accent)' : '1px solid var(--input-border)',
              backgroundColor: range === r ? 'var(--accent)' : 'var(--input-bg)',
              color: range === r ? '#fff' : 'var(--text-main)',
            }}
          >
            {t('sending.days', { days: r })}
          </button>
        ))}
        {loading && (
          <span style={{ color: 'var(--muted-text)', display: 'inline-flex' }} aria-hidden="true">
            <Spinner />
          </span>
        )}
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <Tile label={t('sending.tileToday')} value={`SMS ${todaySms} · ${t('sending.emailWord')} ${todayEmail}`} />
        <Tile label={t('sending.tileRange', { days: range })} value={`SMS ${rangeSmsSent} · ${t('sending.emailWord')} ${rangeEmailSent}`} />
        <Tile label={t('sending.tileFailed')} value={String(rangeFailed)} />
        <Tile label={t('sending.tileBlocked')} value={String(rangeBlocked)} />
      </div>

      {loading && !stats ? (
        <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
      ) : !hasData ? (
        <Card>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{t('sending.noData')}</p>
        </Card>
      ) : (
        <>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {t('sending.smsChart')}
              </h3>
              <Legend />
            </div>
            <StackedBarChart
              series={smsSeries}
              ariaLabel={t('sending.chartAria', { channel: t('sending.smsChart'), days: range })}
            />
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {t('sending.emailChart')}
              </h3>
              <Legend />
            </div>
            <StackedBarChart
              series={emailSeries}
              ariaLabel={t('sending.chartAria', { channel: t('sending.emailChart'), days: range })}
            />
          </Card>
        </>
      )}

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
