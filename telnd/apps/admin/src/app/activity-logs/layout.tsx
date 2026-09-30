'use client';

import { useAuth } from '@/lib/auth-context';
import { ACTIVITY_TYPES } from '@/lib/activity';
import { useRouter, usePathname, notFound } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';

/**
 * /activity-logs side nav — the same panel as the settings sidebar
 * (search + icon/label/description rows, collapsible with its own
 * persisted state, mobile drawer). Sections come from lib/activity.ts;
 * the whole page is one permission (audit.view), so unlike settings
 * there is no per-row filtering — a role without the grant gets a 404
 * for the section, exactly like middleware answers a typed settings URL.
 */
export default function ActivityLogsLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [mainSidebarCollapsed, setMainSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('activitySidebarCollapsed');
    if (stored === 'true') setCollapsed(true);
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
      localStorage.setItem('activitySidebarCollapsed', String(next));
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

  // One permission for the whole page (see module doc) — no grant means
  // the section is not a page at all, same as the settings 404.
  if (!can('audit.view')) notFound();

  const activityNav = ACTIVITY_TYPES.map(item => ({
    ...item,
    label: t(item.labelKey as any),
    description: t(item.descKey as any),
  }));

  const filtered = activityNav.filter(
    (item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
  );

  const sidebarContent = (
    <>
      <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem' }}>
          {t('activity.title')}
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
            placeholder={t('activity.search')}
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
            {t('activity.noResults')}
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
      <div className="activity-mobile-layout" style={{ display: 'none', flexDirection: 'column', height: '100%', padding: '0 1rem' }}>
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
            {t('activity.menu')}
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
                    placeholder={t('activity.search')}
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
                  {t('activity.noResults')}
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
                      padding: '0.625rem 1rem',
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
        {/* Same sticky rule as desktop: no padding-top on the scroller. */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem' }}>
          {children}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="activity-layout" style={{ display: 'flex', height: '100%', position: 'relative' }}>
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
          className="activity-toggle-btn"
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

        {/* No top padding on the SCROLLER: a sticky child pins against the
            scroll container's content edge, so padding-top would stay
            visible between the fixed top bar and the stuck filter bar.
            The space belongs on the page content instead (.activity-page),
            which scrolls away normally. */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '0 2rem 1.5rem 2rem' }}>
          {children}
        </div>
      </div>

      <style>{`
        /* Top spacing for the page content — lives here, not on the
           scroller, so the sticky filter bar pins flush under the top bar. */
        .activity-page { padding-top: 1.5rem; }
        @media (max-width: 768px) {
          .activity-mobile-layout { display: flex !important; }
          .activity-layout { display: none !important; }
          .activity-toggle-btn { display: none !important; }
          .admin-content:has(.activity-layout) {
            padding: 0;
          }
          .activity-page { padding-top: 1rem; }
        }
        @media (min-width: 769px) {
          .activity-layout {
            height: calc(100vh - var(--admin-header-height));
          }
          .admin-content:has(.activity-layout) {
            overflow: hidden;
            padding: 0;
          }
        }
      `}</style>
    </>
  );
}
