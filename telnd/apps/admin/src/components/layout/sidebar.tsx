'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useLanguage } from '@/components/language-provider';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const navSections = [
    {
      title: t('sidebar.main'),
      items: [
        { label: t('sidebar.dashboard'), href: '/', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
      ],
    },
    {
      title: t('sidebar.management'),
      items: [
        { label: t('sidebar.users'), href: '/users', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
        { label: t('sidebar.companies'), href: '/companies', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg> },
        { label: t('sidebar.jobs'), href: '/jobs', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
        { label: t('sidebar.applications'), href: '/applications', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
        { label: t('sidebar.packages'), href: '/packages', hasSubmenu: true, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
          submenu: [
            { label: t('sidebar.allPackages'), href: '/packages' },
            { label: t('sidebar.subscriptions'), href: '/packages/subscriptions' },
            { label: t('sidebar.coupons'), href: '/packages/coupons' },
          ],
          matchPrefix: ['/packages'],
        },
        { label: t('sidebar.reports'), href: '/reports', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4"/></svg> },
      ],
    },
    {
      title: t('sidebar.platform'),
      items: [
        { label: t('sidebar.support'), href: '/support', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
        { label: t('sidebar.activityLogs'), href: '/activity-logs', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
        { label: t('sidebar.settings'), href: '/settings', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
      ],
    },
  ];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (collapsed && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        document.querySelectorAll('.sidebar-sub.open').forEach(s => s.classList.remove('open'));
        document.querySelectorAll('.sidebar-item.active.open-sub').forEach(s => {
          s.classList.remove('active', 'open-sub');
          const a = s.querySelector('.sidebar-arrow');
          if (a) a.classList.remove('open');
        });
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [collapsed]);

  function toggleSubmenu(el: HTMLElement) {
    const isOpen = el.classList.contains('active');
    document.querySelectorAll('.sidebar-item.active.open-sub').forEach(s => {
      s.classList.remove('active', 'open-sub');
      const sa = s.querySelector('.sidebar-arrow');
      if (sa) sa.classList.remove('open');
    });
    document.querySelectorAll('.sidebar-sub.open').forEach(s => {
      s.classList.remove('open');
      (s as HTMLElement).style.top = '';
    });
    if (!isOpen) {
      el.classList.add('active', 'open-sub');
      const arrow = el.querySelector('.sidebar-arrow');
      if (arrow) arrow.classList.add('open');
      const sub = el.nextElementSibling;
      if (sub && sub.classList.contains('sidebar-sub')) {
        sub.classList.add('open');
        if (collapsed) {
          const rect = el.getBoundingClientRect();
          (sub as HTMLElement).style.top = rect.top + 'px';
        }
      }
    }
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  function isSubmenuActive(prefixes: string[]) {
    return prefixes.some(p => pathname.startsWith(p));
  }

  return (
    <>
      <div
        className={`admin-sidebar-overlay${mobileOpen ? ' active' : ''}`}
        onClick={onCloseMobile}
      />
      <aside
        ref={sidebarRef}
        className={`admin-sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
      >
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="sidebar-section-title">{section.title}</div>
            <ul className="sidebar-nav">
              {section.items.map((item) => {
                if (item.hasSubmenu && item.submenu) {
                  const open = isSubmenuActive(item.matchPrefix || []);
                  return (
                    <li key={item.label}>
                      <div
                        className={`sidebar-item${open ? ' active open-sub' : ''}`}
                        onClick={(e) => toggleSubmenu(e.currentTarget)}
                      >
                        <span className="sidebar-icon">{item.icon}</span>
                        <span className="sidebar-label">{item.label}</span>
                        <span className="sidebar-arrow">&#9654;</span>
                      </div>
                      <ul className={`sidebar-sub${open ? ' open' : ''}`}>
                        {item.submenu.map((sub) => (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              className={`sidebar-item${isActive(sub.href) ? ' active' : ''}`}
                              onClick={onCloseMobile}
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`sidebar-item${isActive(item.href) ? ' active' : ''}`}
                      onClick={onCloseMobile}
                    >
                      <span className="sidebar-icon">{item.icon}</span>
                      <span className="sidebar-label">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>
    </>
  );
}
