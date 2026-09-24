import Link from 'next/link';

const FOOTER_LINKS = [
  { href: '/about-us', label: 'About Us' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-and-conditions', label: 'Terms & Conditions' },
  { href: '/team', label: 'Our Team' },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; TELND. All rights reserved.
        </p>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
