import Image from 'next/image';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-950/80">
        <div className="container flex items-center justify-between py-4">
          <Image
            src="/TELND-Logo-3.png"
            alt="TELND"
            width={120}
            height={36}
            priority
            className="h-9 w-auto"
          />
          <ThemeToggle />
        </div>
      </header>
      <section className="container py-20">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
          TELND
        </h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-2xl">
          Career & Talent Platform — Discover opportunities, prove your skills, get hired, and grow your career.
        </p>
        <div className="mt-8 flex gap-4">
          <a
            href="/jobs"
            className="btn-primary"
          >
            Find Jobs
          </a>
          <a
            href="/auth/signup"
            className="btn-secondary"
          >
            Get Started
          </a>
        </div>
      </section>
      
      <section className="container py-12">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Job Search</h3>
            <p className="text-gray-600 dark:text-gray-400">Find your next career opportunity with AI-powered matching.</p>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Tutoring</h3>
            <p className="text-gray-600 dark:text-gray-400">Connect with expert tutors or list your teaching services.</p>
          </div>
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">LMS</h3>
            <p className="text-gray-600 dark:text-gray-400">Access courses, live classes, and AI-powered learning.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
