import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

interface PageData {
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

async function getPage(slug: string): Promise<PageData | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/pages/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: PageData | null };
    if (!json.data || typeof json.data.title !== 'string') return null;
    return json.data;
  } catch {
    return null;
  }
}

/** "privacy-policy" -> "Privacy Policy" (used when the fetch fails). */
function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatUpdated(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  const title = page?.title || titleFromSlug(slug);
  return {
    title: `${title} - TELND`,
    description: page
      ? `${title} on TELND.`
      : `${titleFromSlug(slug)} on TELND.`,
  };
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  const updated = formatUpdated(page.updatedAt);

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-950/80">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/TELND-Logo-3.png"
              alt="TELND"
              width={120}
              height={36}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container py-12">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          {page.title}
        </h1>
        {updated && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Last updated {updated}
          </p>
        )}
        <div
          className="content-prose mt-8"
          dangerouslySetInnerHTML={{ __html: page.content || '' }}
        />
      </div>
    </main>
  );
}
