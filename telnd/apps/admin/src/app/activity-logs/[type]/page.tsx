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

// Which `details` keys we ever show, in display order: who/what first
// (name, email), then context. Shared by the collapsed meta line and the
// expanded breakdown so the two can never drift apart.
const DETAIL_ORDER = ['name', 'email', 'device', 'title', 'company', 'subject', 'to', 'reason', 'method', 'error'];

function detailPairs(item: ActivityItem): [string, string][] {
  const details = item.details || {};
  return DETAIL_ORDER.filter((key) => typeof details[key] === 'string' && details[key]).map(
    (key) => [key, details[key] as string],
  );
}

/** Meta under the actor: target account, sign-in device, job, mail… */
function detailsMeta(item: ActivityItem): string {
  return detailPairs(item)
    .map(([, value]) => value)
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
  const [prevSection, setPrevSection] = useState(type);
  // Rows expanded for their full breakdown (timeline rows are collapsed
  // by default; ids only ever match rows on the current page).
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const filtersActive = Boolean(query || dateFrom || dateTo);

  // A mistyped section is not a page at all — same as the settings 404.
  if (!isActivityKey(type)) notFound();
  const section = ACTIVITY_BY_KEY[type];

  // Section changed → back to page 1, expanded rows folded. Adjusted
  // during render (React's sanctioned pattern) rather than in an effect,
  // so the fetch never fires once with the old page's number against the
  // new section.
  if (type !== prevSection) {
    setPrevSection(type);
    setPage(1);
    setExpanded(new Set());
  }

  // Debounce the search box so typing does not fire a request per
  // keystroke. The page reset lands in the SAME batch as the query, so
  // there is exactly one fetch — with page 1 — per committed change.
  useEffect(() => {
    const next = searchInput.trim();
    if (next === query) return;
    const id = setTimeout(() => {
      setQuery(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput, query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ type, page: String(page), limit: String(PAGE_SIZE) });
    if (query) qs.set('q', query);
    // Date bounds are built in THIS browser's timezone (local midnight /
    // end of day → ISO instant): rows render with toLocaleString(), so
    // only browser-local boundaries can agree with the dates on screen.
    if (dateFrom) qs.set('from', new Date(`${dateFrom}T00:00:00`).toISOString());
    if (dateTo) qs.set('to', new Date(`${dateTo}T23:59:59.999`).toISOString());
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

  // Each filter change resets the page in the same batch, so the next
  // fetch is already for page 1 of the new result set.
  const applyDateFrom = (value: string) => {
    setDateFrom(value);
    setPage(1);
  };
  const applyDateTo = (value: string) => {
    setDateTo(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSearchInput('');
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const toggleRow = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Timeline grouping: bucket the page's rows by their LOCAL calendar day
  // (the cards render local times, so the headers must too). The API
  // orders createdAt desc, so each day's rows arrive contiguously —
  // appending to the last bucket is enough.
  const dayGroups: { key: string; label: string; items: ActivityItem[] }[] = [];
  {
    const now = new Date();
    const todayKey = now.toDateString();
    const yesterdayKey = new Date(now.getTime() - 86_400_000).toDateString();
    for (const item of items) {
      const created = new Date(item.createdAt);
      const key = created.toDateString();
      let group = dayGroups[dayGroups.length - 1];
      if (!group || group.key !== key) {
        const label =
          key === todayKey
            ? t('activity.today')
            : key === yesterdayKey
              ? t('activity.yesterday')
              : created.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        group = { key, label, items: [] };
        dayGroups.push(group);
      }
      group.items.push(item);
    }
  }

  const forbidden = error instanceof ApiError && error.status === 403;

  return (
    // .activity-page supplies the top spacing (see the layout's <style>):
    // the scroller itself carries no padding-top so the sticky bar below
    // pins flush under the fixed top bar.
    <div className="activity-page" style={{ maxWidth: '960px' }}>
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
          {/* Sticky toolbar: the search/date controls stay in view while
              the timeline scrolls under them (bg covers the rows beneath). */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 5,
              backgroundColor: 'var(--bg-main)',
              paddingTop: '0.25rem',
              paddingBottom: '0.5rem',
            }}
          >
            <ActivityFilterBar
              searchInput={searchInput}
              onSearch={setSearchInput}
              dateFrom={dateFrom}
              onDateFrom={applyDateFrom}
              dateTo={dateTo}
              onDateTo={applyDateTo}
              onClear={clearFilters}
            />
          </div>
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
                borderRadius: '12px',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ color: 'var(--muted-text)', marginBottom: '0.5rem' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted-text)', margin: 0 }}>
                {filtersActive ? t('activity.noMatches') : t('activity.empty')}
              </p>
            </div>
          ) : (
            <>
          {/* Timeline: rows grouped under local-day headers, joined by a
              rail between the icon nodes; each row expands for the full
              breakdown (exact time, IP, browser, labeled details). */}
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '0.25rem 1.25rem 0.75rem',
            }}
          >
            {dayGroups.map((group, gi) => (
              <section key={group.key}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginTop: gi === 0 ? '0.625rem' : '1.375rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--muted-text)',
                    }}
                  >
                    {group.label}
                  </span>
                  <span aria-hidden="true" style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
                </div>
                <div style={{ marginTop: '0.25rem' }}>
                  {group.items.map((item, idx) => {
                    const category = ACTIVITY_BY_KEY[item.category] || ACTIVITY_BY_KEY.all;
                    const meta = detailsMeta(item);
                    const isOpen = expanded.has(item.id);
                    const created = new Date(item.createdAt);
                    const pairs = detailPairs(item);
                    return (
                      <div key={item.id} style={{ position: 'relative' }}>
                        {/* Rail: starts at this row's node center and — because
                            height 100% spans this whole entry — lands exactly
                            on the next node's center, expanded or not. */}
                        {idx < group.items.length - 1 && (
                          <span
                            aria-hidden="true"
                            style={{
                              position: 'absolute',
                              left: '27px',
                              top: '30px',
                              width: '2px',
                              height: '100%',
                              backgroundColor: 'var(--border-color)',
                            }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => toggleRow(item.id)}
                          aria-expanded={isOpen}
                          style={{
                            display: 'flex',
                            width: '100%',
                            alignItems: 'flex-start',
                            gap: '0.75rem',
                            padding: '0.75rem 0.5rem 0.75rem 0.625rem',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            transition: 'background-color 0.12s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
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
                              position: 'relative',
                              zIndex: 1,
                              boxShadow: '0 0 0 3px var(--card-bg)',
                            }}
                          >
                            {category.icon}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                {humanizeAction(item.action)}
                              </span>
                              {type === 'all' && (
                                <span
                                  style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em',
                                    color: 'var(--muted-text)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '999px',
                                    padding: '0.0625rem 0.5rem',
                                  }}
                                >
                                  {t(category.labelKey as any)}
                                </span>
                              )}
                              <span
                                style={{
                                  marginLeft: 'auto',
                                  fontSize: '0.75rem',
                                  color: 'var(--muted-text)',
                                  whiteSpace: 'nowrap',
                                }}
                                title={created.toLocaleString()}
                              >
                                {created.toLocaleTimeString()}
                              </span>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                style={{
                                  color: 'var(--muted-text)',
                                  flexShrink: 0,
                                  transform: isOpen ? 'rotate(90deg)' : 'none',
                                  transition: 'transform 0.15s',
                                }}
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </span>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '0.8125rem',
                                color: 'var(--muted-text)',
                                marginTop: '0.2rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.actor ? (
                                <>
                                  <span style={{ color: 'var(--label-text)' }}>{item.actor.name}</span>
                                  {' · '}
                                  {item.actor.email}
                                </>
                              ) : (
                                t('activity.systemActor')
                              )}
                            </span>
                            {(meta || item.ipAddress) && (
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: '0.75rem',
                                  color: 'var(--muted-text)',
                                  marginTop: '0.15rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {[item.ipAddress, meta].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: '0 0.5rem 0.875rem 3.625rem' }}>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.375rem',
                                fontSize: '0.75rem',
                                color: 'var(--muted-text)',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '0.625rem 0.75rem',
                              }}
                            >
                              <span style={{ fontWeight: 600, color: 'var(--label-text)' }}>
                                {created.toLocaleString()}
                              </span>
                              {item.ipAddress && (
                                <span>
                                  <span style={{ fontWeight: 600, color: 'var(--label-text)' }}>
                                    {t('activity.ip')}:{' '}
                                  </span>
                                  {item.ipAddress}
                                </span>
                              )}
                              {item.userAgent && (
                                <span style={{ wordBreak: 'break-word' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--label-text)' }}>
                                    {t('security.deviceLabel')}:{' '}
                                  </span>
                                  {item.userAgent}
                                </span>
                              )}
                              {pairs.length > 0 && (
                                <span
                                  style={{
                                    marginTop: '0.125rem',
                                    fontSize: '0.625rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: 'var(--muted-text)',
                                  }}
                                >
                                  {t('account.groupDetails')}
                                </span>
                              )}
                              {pairs.map(([key, value]) => (
                                <span key={key} style={{ wordBreak: 'break-word' }}>
                                  <span style={{ fontWeight: 600, color: 'var(--label-text)' }}>
                                    {humanizeAction(key)}:{' '}
                                  </span>
                                  {value}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
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
