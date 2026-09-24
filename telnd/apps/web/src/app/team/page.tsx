import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

export const metadata: Metadata = {
  title: 'Our Team - TELND',
  description: 'Meet the team behind TELND.',
};

interface TeamMember {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  photo?: string;
  email?: string;
  linkedin?: string;
  visible?: boolean;
}

async function getMembers(): Promise<TeamMember[] | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/settings/team`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { members?: TeamMember[] } };
    const members = json.data?.members;
    if (!Array.isArray(members) || members.length === 0) return null;
    return members;
  } catch {
    return null;
  }
}

function initial(name: string): string {
  const value = name.trim();
  return value ? value.charAt(0).toUpperCase() : '?';
}

export default async function TeamPage() {
  const allMembers = await getMembers();
  if (!allMembers) notFound();

  const members = allMembers.filter((member) => member.visible !== false);

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
          Our Team
        </h1>
        <p className="mt-3 text-xl text-gray-600 dark:text-gray-400 max-w-2xl">
          The people building TELND.
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <div key={member.id} className="card p-6 flex flex-col">
              <div className="flex items-center gap-4">
                {member.photo ? (
                  <Image
                    src={member.photo}
                    alt={member.name}
                    width={72}
                    height={72}
                    className="h-20 w-20 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-20 w-20 shrink-0 rounded-full bg-accent-500/15 dark:bg-accent-500/20 flex items-center justify-center text-xl font-semibold text-primary-700 dark:text-accent-400"
                  >
                    {initial(member.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {member.name}
                  </h2>
                  {member.title && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {member.title}
                    </p>
                  )}
                </div>
              </div>

              {member.bio && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {member.bio}
                </p>
              )}

              <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="text-primary-700 dark:text-accent-400 hover:underline transition-colors"
                  >
                    {member.email}
                  </a>
                )}
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-700 dark:text-accent-400 hover:underline transition-colors"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
