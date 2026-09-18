import type { Metadata } from 'next';
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
      <body className="antialiased bg-gray-50">{children}</body>
    </html>
  );
}
