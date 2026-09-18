import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: 'Sign Up — TELND',
  description: 'Create your TELND account',
};

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <ThemeToggle />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center">
          Create Account
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 text-center">
          Join TELND and start your career journey
        </p>
        <div className="mt-8 card p-6">
          <p className="text-gray-500 dark:text-gray-500 text-center">
            Sign up form will be implemented here.
          </p>
        </div>
      </div>
    </main>
  );
}
