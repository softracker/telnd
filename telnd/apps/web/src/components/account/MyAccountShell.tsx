'use client';

// My Account's shell (§14.51) — the admin panel's layout, replicated for
// the user site: fixed header, collapsible rail, scrollable content
// pane, same geometry and behaviour (the CSS is the admin file, scoped —
// see styles/account.css). The session gate runs FIRST: a signed-out
// visitor never sees the shell — they are sent to the sign-in flow with
// the trip remembered (?next=/my-account), so logging in lands back
// here. The nav items and the page contents are placeholders until the
// real account screens land ("later we will change and put the contents
// into it").

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { Spinner } from '@/components/auth/AuthUI';

function CenteredSpinner() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-white dark:bg-[#0D0D0D]"
      role="status"
      aria-label="Checking your session"
    >
      <Spinner className="h-8 w-8" />
    </div>
  );
}

/** Placeholder nav — replaced when the account contents arrive. */
const NAV = [
  {
    title: 'Account',
    items: [
      {
        label: 'Overview',
        href: '/my-account',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
        ),
      },
      {
        label: 'Profile',
        soon: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        ),
      },
      {
        label: 'Security',
        soon: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
        ),
      },
      {
        label: 'Notifications',
        soon: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        ),
      },
    ],
  },
] as const;

export function MyAccountShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useSession();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Session gate: no account on the cookie → the sign-in flow, with this
  // page remembered as the landing (?next=/my-account).
  useEffect(() => {
    if (!loading && !user) router.replace('/auth?next=/my-account');
  }, [loading, user, router]);

  useEffect(() => {
    try {
      if (localStorage.getItem('accountSidebarCollapsed') === 'true') setCollapsed(true);
    } catch {
      // Storage unavailable — default to the expanded rail.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('accountSidebarCollapsed', String(collapsed));
    } catch {
      // Storage unavailable — the rail just forgets its position.
    }
  }, [collapsed]);

  // Navigation closes the mobile drawer and the avatar dropdown.
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Still asking, or sending the visitor to the sign-in flow — the shell
  // never paints for someone without a session.
  if (loading || !user) return <CenteredSpinner />;

  const displayName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'My Account';

  const signOut = async () => {
    setDropdownOpen(false);
    try {
      await api.post('/api/auth/logout', {});
    } catch {
      // Already signed out (or the API is unreachable) — leave anyway.
    }
    window.location.assign('/');
  };

  return (
    <div className="account-shell">
      <div className="admin-body">
        {/* ── Header ── */}
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              type="button"
              className="sidebar-toggle mobile-menu-btn"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu"
              title="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <button
              type="button"
              className="sidebar-toggle desktop-toggle"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><polyline points="10 10 13 12 10 14" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="15 10 12 12 15 14" /></svg>
              )}
            </button>
            <Link href="/" className="admin-logo" aria-label="TELND home" title="TELND home">
              <Image
                src="/TELND-Logo-3.png"
                alt="TELND"
                width={120}
                height={36}
                className="h-[26px] w-auto"
              />
            </Link>
          </div>
          <div className="admin-header-right">
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="admin-user"
                onClick={() => setDropdownOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
              >
                <span className="admin-user-avatar">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    displayName[0]?.toUpperCase() || 'A'
                  )}
                </span>
                <span className="admin-user-name">{displayName}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-light)', flexShrink: 0 }} aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              <div className={`admin-user-dropdown${dropdownOpen ? ' active' : ''}`} role="menu">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.625rem 0.875rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayName}
                  </span>
                </div>
                <div className="dropdown-divider" />
                <Link href="/" role="menuitem" onClick={() => setDropdownOpen(false)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  Back to site
                </Link>
                <div className="dropdown-divider" />
                <button type="button" role="menuitem" onClick={() => void signOut()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Rail + content ── */}
        <div className="admin-layout">
          <div
            className={`admin-sidebar-overlay${mobileOpen ? ' active' : ''}`}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className={`admin-sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {NAV.map((section) => (
              <div key={section.title} style={{ flexShrink: 0 }}>
                <div className="sidebar-section-title">{section.title}</div>
                <ul className="sidebar-nav">
                  {section.items.map((item) =>
                    'href' in item && !('soon' in item && item.soon) ? (
                      <li key={item.label}>
                        <Link
                          href={item.href}
                          className={`sidebar-item${pathname === item.href ? ' active' : ''}`}
                          onClick={() => setMobileOpen(false)}
                        >
                          <span className="sidebar-icon">{item.icon}</span>
                          <span className="sidebar-label">{item.label}</span>
                        </Link>
                      </li>
                    ) : (
                      <li key={item.label}>
                        {/* Placeholder — the section arrives with the
                            account contents in a later round. */}
                        <span className="sidebar-item" title="Coming soon">
                          <span className="sidebar-icon">{item.icon}</span>
                          <span className="sidebar-label">{item.label}</span>
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}

            {/* Utility row at the foot of the rail — same icon-cell
                treatment as the admin panel. */}
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                marginTop: 'auto',
                flexShrink: 0,
                backgroundColor: 'var(--sidebar-bg)',
                borderTop: '1px solid var(--sidebar-border)',
                padding: collapsed ? '0.4rem 0.3rem' : '0.5rem',
              }}
            >
              <div style={{ display: 'flex', flexDirection: collapsed ? 'column' : 'row', gap: '2px' }}>
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="sidebar-item"
                  aria-label="Back to site"
                  title="Back to site"
                  style={{
                    flex: collapsed ? '0 0 auto' : '1 1 0',
                    minWidth: 0,
                    justifyContent: 'center',
                    padding: '0.6rem 0',
                    margin: 0,
                  }}
                >
                  <span className="sidebar-icon" style={{ margin: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="sidebar-item"
                  aria-label="Sign out"
                  title="Sign out"
                  style={{
                    flex: collapsed ? '0 0 auto' : '1 1 0',
                    minWidth: 0,
                    justifyContent: 'center',
                    padding: '0.6rem 0',
                    margin: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  <span className="sidebar-icon" style={{ margin: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  </span>
                </button>
              </div>
            </div>
          </aside>

          <main className="admin-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
