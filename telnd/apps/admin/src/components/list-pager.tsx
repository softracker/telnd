'use client';

import { useLanguage } from '@/components/language-provider';

const pagerBtnStyle: React.CSSProperties = {
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--secondary-btn-bg)',
  color: 'var(--text-main)',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
};

// Shared DataTables-style pager for the server-side lists (rows per page
// configurable, default 5). Renders nothing when there's nothing to page.
export function ListPager({
  page,
  totalPages,
  filteredTotal,
  loading,
  onPageChange,
  pageSize = 5,
}: {
  page: number;
  totalPages: number;
  filteredTotal: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  pageSize?: number;
}) {
  const { t } = useLanguage();
  if (filteredTotal <= 0) return null;
  const prevDisabled = page <= 1 || loading;
  const nextDisabled = page >= totalPages || loading;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--muted-text)',
      }}
    >
      <span>
        {t('account.showingRange', {
          start: (page - 1) * pageSize + 1,
          end: Math.min(page * pageSize, filteredTotal),
          total: filteredTotal,
        })}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={prevDisabled}
          style={{
            ...pagerBtnStyle,
            opacity: prevDisabled ? 0.45 : 1,
            cursor: prevDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {t('common.prev')}
        </button>
        <span style={{ whiteSpace: 'nowrap' }}>
          {t('account.pageOf', { page, total: totalPages })}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={nextDisabled}
          style={{
            ...pagerBtnStyle,
            opacity: nextDisabled ? 0.45 : 1,
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  );
}
