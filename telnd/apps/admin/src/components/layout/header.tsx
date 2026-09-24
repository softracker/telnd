'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRef, useEffect, useState } from 'react';
import { useLanguage } from '@/components/language-provider';

interface HeaderProps {
  onToggleSidebar: () => void;
  collapsed: boolean;
  onToggleMobile: () => void;
  primaryLogoLight?: string;
  primaryLogoDark?: string;
}

export default function Header({
  onToggleSidebar,
  collapsed,
  onToggleMobile,
  primaryLogoLight,
  primaryLogoDark,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button className="sidebar-toggle mobile-menu-btn" onClick={onToggleMobile} title={t('header.menu')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <button className="sidebar-toggle desktop-toggle" onClick={onToggleSidebar} title={t('header.toggleSidebar')}>
          {collapsed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polyline points="10 10 13 12 10 14"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="15 10 12 12 15 14"/></svg>
          )}
        </button>
        <Link href="/" className="admin-logo">
          {primaryLogoLight || primaryLogoDark ? (
            <>
              {primaryLogoLight && (
                <img
                  className={`admin-logo-img logo-light${primaryLogoDark ? '' : ' only'}`}
                  src={primaryLogoLight}
                  alt="TELND"
                  height={26}
                />
              )}
              {primaryLogoDark && (
                <img
                  className={`admin-logo-img logo-dark${primaryLogoLight ? '' : ' only'}`}
                  src={primaryLogoDark}
                  alt="TELND"
                  height={26}
                />
              )}
            </>
          ) : (
            t('app.name')
          )}
        </Link>
      </div>
      <div className="admin-header-right">
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div className="admin-user" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="admin-user-avatar">
              {user?.firstName?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="admin-user-name">{user?.firstName} {user?.lastName}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-light)', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div className={`admin-user-dropdown${dropdownOpen ? ' active' : ''}`}>
            <Link href="/" onClick={() => setDropdownOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              {t('header.dashboard')}
            </Link>
            <Link href="/settings" onClick={() => setDropdownOpen(false)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              {t('header.settings')}
            </Link>
            <div className="dropdown-divider" />
            <button onClick={() => { setDropdownOpen(false); logout(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {t('header.signOut')}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
