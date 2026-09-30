'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useLanguage } from '@/components/language-provider';
import { api, ApiError } from '@/lib/api';
import {
  ACTIVITY_BY_KEY,
  humanizeAction,
  isActivityKey,
  type ActivityItem,
  type ActivityResponse,
} from '@/lib/activity';
import { ListPager } from '@/components/list-pager';

const PAGE_SIZE = 20;

function Spinner({ size = 16 }: { size?: number }) {
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

/** Meta under the actor: target account, sign-in device, job, mail… */
function detailsMeta(item: ActivityItem): string {
  const details = item.details || {};
  // Order is display order: who/what first (name, email), then context.
  return ['name', 'email', 'device', 'title', 'company', 'subject', 'to', 'reason', 'method', 'error']
    .map((key) => details[key])
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' · ');
}

/**
 * Server-side search + date range. This component only holds the widgets —
 * every value goes up to the page and is sent as q/from/to so the API can
 * filter (and count) in SQL; nothing is ever sliced client-side.
 */
function ActivityFilterBar({
  searchInput,
  onSearch,
  dateFrom,
  onDateFrom,
  dateTo,
  onDateTo,
  onClear,
}: {
  searchInput: string;
  onSearch: (value: string) => void;
  dateFrom: string;
  onDateFrom: (value: string) => void;
  dateTo: string;
  onDateTo: (value: string) => void;
  onClear: () => void;
}) {
  const { t } = useLanguage();
  const active = Boolean(searchInput || dateFrom || dateTo);
  const field: CSSProperties = {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--input-border)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-main)',
    fontSize: '0.8125rem',
    outline: 'none',
    fontFamily: 'inherit',
  };
  const dateLabel: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: 'var(--muted-text)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  };
  const clearLabel = t('activity.clearFilters');
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
      <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '180px' }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '0.625rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted-text)',
            pointerEvents: 'none',
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('activity.searchPlaceholder')}
          aria-label={t('activity.searchPlaceholder')}
          style={{ ...field, width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', boxSizing: 'border-box' }}
        />
      </div>
      <label style={dateLabel}>
        {t('activity.filterFrom')}
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => onDateFrom(e.target.value)}
          style={{ ...field, padding: '0.4375rem 0.625rem' }}
        />
      </label>
      <label style={dateLabel}>
        {t('activity.filterTo')}
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => onDateTo(e.target.value)}
          style={{ ...field, padding: '0.4375rem 0.625rem' }}
        />
      </label>
      {active && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          title={clearLabel}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--secondary-btn-bg)',
            color: 'var(--text-main)',
            cursor: 'pointer',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function ActivitySectionPage() {
  const params = useParams<{ type: string }>();
  const type = params?.type ?? '';
  const { t } = useLanguage();

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<{ sent: number; failed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  // Filter bar — every value is sent to the API and applied in SQL
  // (search + date range are server-side, never a client-side slice).
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const filtersActive = Boolean(query || dateFrom || dateTo);

  // A mistyped section is not a page at all — same as the settings 404.
  if (!isActivityKey(type)) notFound();
  const section = ACTIVITY_BY_KEY[type];

  // Any change to the section or a filter restarts at page 1.
  useEffect(() => {
    setPage(1);
  }, [type, query, dateFrom, dateTo]);

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === query) return;
    const id = setTimeout(() => setQuery(next), 300);
    return () => clearTimeout(id);
  }, [searchInput, query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ type, page: String(page), limit: String(PAGE_SIZE) });
    if (query) qs.set('q', query);
    if (dateFrom) qs.set('from', dateFrom);
    if (dateTo) qs.set('to', dateTo);
    api
      .get<{ success: boolean; data: ActivityResponse }>(`/api/admin/activity?${qs.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.items);
        setTotal(res.data.total);
        setTotalPages(Math.max(res.data.totalPages, 1));
        setSummary(res.data.summary ?? null);
        setError(null);
      })
      .catch((err: ApiError | Error) => {
        if (cancelled) return;
        setError(err);
        setItems([]);
        setTotal(0);
        setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, page, query, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchInput('');
    setQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const forbidden = error instanceof ApiError && error.status === 403;

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* Header identical to the settings pages: tight title→description
          gap (h1 margin-bottom, not the browser default), same weights. */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
          {t(section.labelKey as any)}
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {t(section.descKey as any)}
        </p>
        {summary && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--muted-text)',
                border: '1px solid var(--border-color)',
                borderRadius: '999px',
                padding: '0.15rem 0.625rem',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              {t('activity.sent', { n: summary.sent })}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--error-text, #ef4444)',
                border: '1px solid var(--border-color)',
                borderRadius: '999px',
                padding: '0.15rem 0.625rem',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              {t('activity.failed', { n: summary.failed })}
            </span>
          </div>
        )}
      </div>

      {forbidden ? (
        <div
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)' }}>
            {t('activity.noPermission')}
          </p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: 'var(--error-text, #ef4444)' }}>{error.message}</p>
        </div>
      ) : (
        <>
          <ActivityFilterBar
            searchInput={searchInput}
            onSearch={setSearchInput}
            dateFrom={dateFrom}
            onDateFrom={setDateFrom}
            dateTo={dateTo}
            onDateTo={setDateTo}
            onClear={clearFilters}
          />
          {loading && items.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0', color: 'var(--muted-text)' }}>
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <div
              style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
              }}
            >
              <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)' }}>
                {filtersActive ? t('activity.noMatches') : t('activity.empty')}
              </p>
            </div>
          ) : (
            <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {items.map((item) => {
              const category = ACTIVITY_BY_KEY[item.category] || ACTIVITY_BY_KEY.all;
              const meta = detailsMeta(item);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: '36px',
                      height: '36px',
                      flexShrink: 0,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--accent-light)',
                      color: 'var(--accent)',
                    }}
                  >
                    {category.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {humanizeAction(item.action)}
                        {type === 'all' && (
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                              color: 'var(--muted-text)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '999px',
                              padding: '0.0625rem 0.5rem',
                              verticalAlign: 'middle',
                            }}
                          >
                            {t(category.labelKey as any)}
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--muted-text)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', marginTop: '0.15rem' }}>
                      {item.actor ? (
                        <>
                          <span style={{ color: 'var(--label-text)' }}>{item.actor.name}</span>
                          {' · '}
                          {item.actor.email}
                        </>
                      ) : (
                        t('activity.systemActor')
                      )}
                    </div>
                    {(meta || item.ipAddress) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.2rem' }}>
                        {[item.ipAddress, meta].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ListPager
            page={page}
            totalPages={totalPages}
            filteredTotal={total}
            loading={loading}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
          />
            </>
          )}
        </>
      )}
    </div>
  );
}
