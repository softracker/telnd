'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';

const settingsNavKeys = [
  { key: 'general' as const, href: '/settings/general', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )},
  { key: 'account' as const, href: '/settings/account', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )},
  { key: 'security' as const, href: '/settings/security', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )},
  { key: 'loginProviders' as const, href: '/settings/login-providers', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )},
  { key: 'captcha' as const, href: '/settings/captcha', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )},
  { key: 'smtp' as const, href: '/settings/smtp', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )},
  { key: 'objectStorage' as const, href: '/settings/object-storage', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )},
  { key: 'offices' as const, href: '/settings/offices', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )},
  { key: 'team' as const, href: '/settings/team', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )},
  { key: 'organization' as const, href: '/settings/organization', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )},
  { key: 'preferences' as const, href: '/settings/preferences', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  )},
  { key: 'payment' as const, href: '/settings/payment', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )},
  { key: 'gateway' as const, href: '/settings/gateway', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )},
  { key: 'about' as const, href: '/settings/about', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )},
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('settingsSidebarCollapsed') === 'true';
    }
    return false;
  });
  const [mainSidebarCollapsed, setMainSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminSidebarCollapsed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    function detect() {
      const sidebar = document.querySelector('.admin-sidebar');
      if (sidebar) setMainSidebarCollapsed(sidebar.classList.contains('collapsed'));
    }
    detect();
    const observer = new MutationObserver(detect);
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('settingsSidebarCollapsed', String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isLoading || !isAuthenticated) return null;

  const settingsNav = settingsNavKeys.map(item => ({
    ...item,
    label: t(`settingsNav.${item.key}` as any),
    description: t(`settingsNav.${item.key}Desc` as any),
  }));

  const filtered = settingsNav.filter(
    (item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarContent = (
    <>
      <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem' }}>
          {t('settings.title')}
        </h2>
        <div style={{ position: 'relative' }}>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted-text)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={t('settings.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              padding: '0 0.75rem 0 2.25rem',
              fontSize: '0.8125rem',
              outline: 'none',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-main)',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
          />
        </div>
      </div>
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0.75rem 1rem' }}>
        {filtered.length === 0 && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', padding: '1rem 0.5rem', textAlign: 'center' }}>
            {t('settings.noResults')}
          </p>
        )}
        {filtered.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.625rem 0.75rem',
                borderRadius: '8px',
                marginBottom: '0.125rem',
                textDecoration: 'none',
                backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{
                marginTop: '1px',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                flexShrink: 0,
              }}>
                {item.icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--accent)' : 'var(--label-text)',
                  lineHeight: 1.3,
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--muted-text)',
                  lineHeight: 1.4,
                  marginTop: '0.125rem',
                }}>
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile layout */}
      <div className="settings-mobile-layout" style={{ display: 'none', flexDirection: 'column', height: '100%', padding: '0 1rem' }}>
        <div style={{ paddingTop: '0.75rem', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-bg)',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--label-text)',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            {t('settings.menu')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', transform: mobileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {mobileOpen && (
            <div style={{
              marginTop: '0.5rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--input-border)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative' }}>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted-text)" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t('settings.search')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '8px',
                      border: '1px solid var(--input-border)',
                      padding: '0 0.75rem 0 2.25rem',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-main)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                  />
                </div>
              </div>
              {filtered.length === 0 && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted-text)', padding: '1rem', textAlign: 'center' }}>
                  {t('settings.noResults')}
                </p>
              )}
              {filtered.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      textDecoration: 'none',
                      backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--accent)' : 'var(--label-text)' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.125rem' }}>{item.description}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {children}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="settings-layout" style={{ display: 'flex', height: '100%', position: 'relative' }}>
        <aside style={{
          width: collapsed ? '0px' : '260px',
          minWidth: collapsed ? '0px' : '260px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'var(--bg-secondary)',
          borderRight: collapsed ? 'none' : '1px solid var(--border-color)',
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease, min-width 0.2s ease',
        }}>
          <div style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: collapsed ? 'none' : 'auto', minWidth: '260px', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {sidebarContent}
          </div>
        </aside>

        <button
          className="settings-toggle-btn"
          onClick={toggleCollapsed}
          style={{
            position: 'fixed',
            left: collapsed
              ? (mainSidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)')
              : (mainSidebarCollapsed ? 'calc(var(--sidebar-collapsed) + 260px)' : 'calc(var(--sidebar-width) + 260px)'),
            top: 'calc(var(--admin-header-height) + (100vh - var(--admin-header-height)) / 2)',
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--input-border)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'left 0.2s ease, background-color 0.15s, opacity 0.15s',
            opacity: 0.5,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--card-bg)'; e.currentTarget.style.opacity = '0.5'; }}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '1.5rem 2rem' }}>
          {children}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .settings-mobile-layout { display: flex !important; }
          .settings-layout { display: none !important; }
          .settings-toggle-btn { display: none !important; }
          .admin-content:has(.settings-layout) {
            padding: 0;
          }
        }
        @media (min-width: 769px) {
          .settings-layout {
            height: calc(100vh - var(--admin-header-height));
          }
          .admin-content:has(.settings-layout) {
            overflow: hidden;
            padding: 0;
          }
        }
      `}</style>
    </>
  );
}
