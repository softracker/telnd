'use client';

import { useLanguage } from '@/components/language-provider';

export default function GatewaySettingsPage() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{t('gateway.title')}</h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('gateway.description')}</p>
    </div>
  );
}
