import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'TELND — Career & Talent Platform',
  description: 'TELND is a career and talent ecosystem that helps people prepare for careers, discover opportunities, prove their skills, get hired, and continue growing.',
  keywords: ['jobs', 'career', 'hiring', 'Bangladesh', 'employment', 'recruitment'],
  openGraph: {
    title: 'TELND — Career & Talent Platform',
    description: 'Discover opportunities, prove your skills, get hired.',
    type: 'website',
    locale: 'en_US',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-glow">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
