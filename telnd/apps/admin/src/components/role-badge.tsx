'use client';

import { useLanguage } from '@/components/language-provider';

interface RoleBadgeProps {
  /** Role name, e.g. "Super Admin". Renders nothing when empty. */
  name?: string | null;
  /** True when the role holds the "*" wildcard (full access). */
  full?: boolean;
  small?: boolean;
}

/**
 * Pill badge that visualises an admin's role. The full-access (super admin)
 * variant is filled with the accent color; regular roles get a light chip.
 */
export default function RoleBadge({ name, full = false, small = false }: RoleBadgeProps) {
  const { t } = useLanguage();
  if (!name) return null;

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    borderRadius: '999px',
    fontWeight: 600,
    fontSize: small ? '0.6875rem' : '0.75rem',
    lineHeight: 1,
    padding: small ? '0.25rem 0.5rem' : '0.3125rem 0.625rem',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  };

  const style: React.CSSProperties = full
    ? { ...base, background: 'var(--accent)', color: '#ffffff' }
    : { ...base, background: 'var(--accent-light)', color: 'var(--accent)' };

  return (
    <span style={style} title={full ? t('roles.fullAccess') : undefined}>
      {full && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01z" />
        </svg>
      )}
      {name}
    </span>
  );
}
