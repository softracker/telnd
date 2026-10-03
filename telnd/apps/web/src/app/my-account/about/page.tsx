'use client';

// About (§14.61) — the panel's About, given the setup-card treatment the
// operator wants everywhere: the product identity, the standing site
// links (the same four the footer carries), and the version. Copy comes
// from the site's own metadata so the two never drift in meaning; the
// version number is the one piece to keep in step with package.json.

import Link from 'next/link';
import { Row, card, quietBtn } from '@/components/account/ui';

// Keep in step with apps/web/package.json ("version").
const APP_VERSION = '0.1.0';

const STAND_LINKS = [
  { href: '/about-us', label: 'About Us' },
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-and-conditions', label: 'Terms & Conditions' },
  { href: '/team', label: 'Our Team' },
];

export default function AboutPage() {
  return (
    <>
      <h1>About</h1>

      <div className={`mt-4 ${card}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">TELND — Career &amp; Talent Platform</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          TELND is a career and talent ecosystem that helps people prepare for careers, discover opportunities,
          prove their skills, get hired, and continue growing.
        </p>

        <div className="mt-4 divide-y divide-gray-100 dark:divide-white/10">
          <Row title="Version" detail={APP_VERSION} />
          <Row
            title="Your account"
            detail="Profile, security, sign-in methods and preferences live in the sections of this settings area."
            aside={
              <Link href="/my-account" className={quietBtn} title="Back to your account overview">
                Overview
              </Link>
            }
          />
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6 dark:border-white/10">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Site</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {STAND_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={quietBtn} title={link.label}>
                {link.label}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-gray-500 dark:text-white/45">
            &copy; TELND. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
