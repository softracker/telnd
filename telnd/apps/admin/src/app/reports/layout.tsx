'use client';

// Reports section nav — a deliberate mirror of the Settings menu layout
// (title, search, label+description entries, mobile + desktop rails, and
// the same collapse persistence under its own key). One report lives here
// today; the shape stays so the next analytics page is a nav line + a
// REPORTS_SECTIONS grant away.

import { useAuth } from '@/lib/auth-context';
import { REPORTS_SECTION_BY_HREF, sectionPermitted } from '@/lib/permissions';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';

const reportsNavKeys = [
  { key: 'sending' as const, href: '/reports/sending', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )},
  // One entry per report, listed in nav order — each backed by a
  // REPORTS_SECTIONS grant in lib/permissions (nav filter + middleware).
  // More analytics join this list as they land.
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  // Sidebar collapse state drives layout attributes — start from the
  // server-rendered default and apply the stored values after hydration
  // (localStorage during the first render breaks hydration).
  const [collapsed, setCollapsed] = useState(false);
  const [mainSidebarCollapsed, setMainSidebarCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem('reportsSidebarCollapsed') === 'true');
    setMainSidebarCollapsed(localStorage.getItem('adminSidebarCollapsed') === 'true');
  }, []);

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
      localStorage.setItem('reportsSidebarCollapsed', String(next));
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

  // Sections the current role has no grant for are not options at all —
  // they never render in the nav (desktop or mobile; middleware covers a
  // typed URL with a 404).
  const reportsNav = reportsNavKeys
    .filter(item => sectionPermitted(REPORTS_SECTION_BY_HREF[item.href], can))
    .map(item => ({
      ...item,
      label: t(`reportsNav.${item.key}` as any),
      description: t(`reportsNav.${item.key}Desc` as any),
    }));

  const filtered = reportsNav.filter(
    (item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarContent = (
    <>
      <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem' }}>
          {t('reports.title')}
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
            placeholder={t('reports.search')}
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
            {t('reports.noResults')}
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
      <div className="reports-mobile-layout" style={{ display: 'none', flexDirection: 'column', height: '100%', padding: '0 1rem' }}>
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
            {t('reports.menu')}
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
                    placeholder={t('reports.search')}
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
                  {t('reports.noResults')}
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
      <div className="reports-layout" style={{ display: 'flex', height: '100%', position: 'relative' }}>
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
          className="reports-toggle-btn"
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
          .reports-mobile-layout { display: flex !important; }
          .reports-layout { display: none !important; }
          .reports-toggle-btn { display: none !important; }
          .admin-content:has(.reports-layout) {
            padding: 0;
          }
        }
        @media (min-width: 769px) {
          .reports-layout {
            height: calc(100vh - var(--admin-header-height));
          }
          .admin-content:has(.reports-layout) {
            overflow: hidden;
            padding: 0;
          }
        }
      `}</style>
    </>
  );
}
