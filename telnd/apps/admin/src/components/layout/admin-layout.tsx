'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Sidebar from './sidebar';
import Header from './header';

interface AdminLayoutProps {
  children: React.ReactNode;
  primaryLogoLight?: string;
  primaryLogoDark?: string;
}

export default function AdminLayout({
  children,
  primaryLogoLight,
  primaryLogoDark,
}: AdminLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isLoginPage) router.replace('/login');
    if (isAuthenticated && isLoginPage) router.replace('/');
  }, [isAuthenticated, isLoading, router, isLoginPage]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleToggleSidebar = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const handleToggleMobile = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{
          display: 'inline-block',
          width: 32,
          height: 32,
          border: '3px solid #e2e5ea',
          borderTopColor: '#034548',
          borderRadius: '50%',
          animation: 'dt-spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes dt-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Login page always renders just the children (no sidebar/header)
  // The useEffect above handles redirect to / when authenticated
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) return null;

  return (
    <div className="admin-body">
      <Header
        onToggleSidebar={handleToggleSidebar}
        collapsed={collapsed}
        onToggleMobile={handleToggleMobile}
        primaryLogoLight={primaryLogoLight}
        primaryLogoDark={primaryLogoDark}
      />
      <div className="admin-layout">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={handleCloseMobile}
        />
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
