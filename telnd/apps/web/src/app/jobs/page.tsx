import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'Jobs — TELND',
  description: 'Find your next career opportunity on TELND',
};

export default function JobsPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TELND</h1>
          <ThemeToggle />
        </div>
      </header>
      
      <div className="container py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Listings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Discover opportunities that match your skills and preferences.
        </p>
        <div className="mt-8">
          <p className="text-gray-500 dark:text-gray-500">Job listings will be displayed here.</p>
        </div>
      </div>
    </main>
  );
}
