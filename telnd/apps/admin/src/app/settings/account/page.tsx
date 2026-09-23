'use client';

import { useLanguage } from '@/components/language-provider';

export default function AccountSettingsPage() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{t('account.title')}</h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('account.description')}</p>
    </div>
  );
}
