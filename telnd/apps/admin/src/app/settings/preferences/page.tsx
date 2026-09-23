'use client';

import { useTheme } from '@/components/theme-provider';
import { useLanguage } from '@/components/language-provider';
import type { Language } from '@/lib/translations';

export default function PreferencesSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const themes = [
    { value: 'light' as const, label: t('preferences.light'), description: t('preferences.lightDesc'), icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    )},
    { value: 'dark' as const, label: t('preferences.dark'), description: t('preferences.darkDesc'), icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    )},
    { value: 'system' as const, label: t('preferences.system'), description: t('preferences.systemDesc'), icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )},
  ];

  const languages = [
    { value: 'en' as Language, label: 'English', native: 'English', flag: '🇺🇸' },
    { value: 'bn' as Language, label: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>{t('preferences.title')}</h1>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '2rem' }}>{t('preferences.description')}</p>

      {/* Language Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>{t('preferences.language')}</h2>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>{t('preferences.languageDesc')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {languages.map((lang) => {
            const isActive = language === lang.value;
            return (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `2px solid ${isActive ? '#034548' : '#e5e7eb'}`,
                  backgroundColor: isActive ? '#f0fdf9' : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{lang.flag}</span>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500, color: isActive ? '#034548' : '#374151' }}>
                    {lang.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{lang.native}</div>
                </div>
                {isActive && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#034548" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Section */}
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '0.25rem' }}>{t('preferences.theme')}</h2>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>{t('preferences.themeDesc')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {themes.map((item) => {
            const isActive = theme === item.value;
            return (
              <button
                key={item.value}
                onClick={() => setTheme(item.value)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1.25rem 1rem',
                  borderRadius: '10px',
                  border: `2px solid ${isActive ? '#034548' : '#e5e7eb'}`,
                  backgroundColor: isActive ? '#f0fdf9' : '#fff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? '#034548' : '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#fff' : '#6b7280',
                  transition: 'all 0.15s',
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500, color: isActive ? '#034548' : '#374151' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.125rem' }}>
                    {item.description}
                  </div>
                </div>
                {isActive && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#034548" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
