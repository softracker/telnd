'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

const settingsNav = [
  { label: 'CAPTCHA', href: '/settings/captcha', icon: '🔒' },
  { label: 'SMTP / Email', href: '/settings/smtp', icon: '✉️' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '1.5rem 0', minHeight: 'calc(100vh - 120px)' }}>
      <aside style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid #e5e7eb',
        paddingRight: '1.5rem',
      }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingLeft: '0.75rem' }}>
          Settings
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {settingsNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#034548' : '#374151',
                  backgroundColor: isActive ? '#f0fdfa' : 'transparent',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s, color 0.15s',
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
