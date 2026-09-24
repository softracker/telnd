import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/components/language-provider';
import AdminLayout from '@/components/layout/admin-layout';
import './globals.css';
import '@/styles/admin.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface GeneralSettings {
  favicon?: string;
  primaryLogoLight?: string;
  primaryLogoDark?: string;
}

/**
 * General settings (public endpoint). Used for the tab favicon and the header
 * logos; any failure (API down, nothing configured) falls back to defaults.
 * Identical calls in generateMetadata and the layout body are request-memoized.
 */
async function getGeneral(): Promise<GeneralSettings> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/settings/general`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return {};
    const json = (await res.json()) as { data?: GeneralSettings };
    return json.data ?? {};
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { favicon } = await getGeneral();
  return {
    title: 'TELND Admin',
    description: 'TELND Administration Dashboard',
    ...(favicon ? { icons: { icon: favicon } } : {}),
  };
}

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { primaryLogoLight, primaryLogoDark } = await getGeneral();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AdminLayout
                primaryLogoLight={primaryLogoLight}
                primaryLogoDark={primaryLogoDark}
              >
                {children}
              </AdminLayout>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
