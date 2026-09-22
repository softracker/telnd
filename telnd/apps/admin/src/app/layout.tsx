import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import AdminLayout from '@/components/layout/admin-layout';
import './globals.css';

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
          <AdminLayout>{children}</AdminLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
