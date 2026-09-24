import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Footer } from '@/components/Footer';
import './globals.css';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * Favicon saved in Admin → Settings → General. The endpoint is public, and any
 * failure (API down, none configured) just falls back to the browser default.
 */
async function getFavicon(): Promise<string | undefined> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/settings/general`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { data?: { favicon?: unknown } };
    const favicon = json.data?.favicon;
    return typeof favicon === 'string' && favicon ? favicon : undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const favicon = await getFavicon();
  return {
    title: 'TELND — Career & Talent Platform',
    description: 'TELND is a career and talent ecosystem that helps people prepare for careers, discover opportunities, prove their skills, get hired, and continue growing.',
    keywords: ['jobs', 'career', 'hiring', 'Bangladesh', 'employment', 'recruitment'],
    openGraph: {
      title: 'TELND — Career & Talent Platform',
      description: 'Discover opportunities, prove your skills, get hired.',
      type: 'website',
      locale: 'en_US',
    },
    ...(favicon ? { icons: { icon: favicon } } : {}),
  };
}

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
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
