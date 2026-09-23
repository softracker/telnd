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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
