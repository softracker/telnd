import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/components/language-provider';
import AdminLayout from '@/components/layout/admin-layout';
import './globals.css';
import '@/styles/admin.css';

export const metadata: Metadata = {
  title: 'TELND Admin',
  description: 'TELND Administration Dashboard',
};

const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('telnd_admin_theme') || 'system';
      var r = t === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : t;
      document.documentElement.setAttribute('data-theme', r);
      document.documentElement.style.backgroundColor = r === 'dark' ? '#12141a' : '#f4f5f6';
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AdminLayout>{children}</AdminLayout>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
