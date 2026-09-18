'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
}

export function Header({ searchValue = '', onSearchChange, showSearch = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-950/80">
      <div className="flex items-center justify-between h-16 px-6 gap-4">
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

        {showSearch && (
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <input
              type="text"
              placeholder="Search components..."
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100/60 dark:bg-gray-800/60 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500/20 focus:outline-none transition-colors"
            />
          </div>
        )}

        <div className="flex items-center gap-4 shrink-0">
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-600 dark:text-gray-400">
            <Link href="/" className="hover:text-primary-700 dark:hover:text-accent-400 transition-colors">
              Home
            </Link>
            <Link href="/components" className="hover:text-primary-700 dark:hover:text-accent-400 transition-colors">
              Components
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
