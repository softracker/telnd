'use client';

// Welcome / method chooser — the portal's twin of the Flutter app's
// auth_welcome_page.dart: floating mascot over a #E6F6F5 wash, then the
// white "Sign up or Log in" sheet with Email, Phone Number, the social row
// and the legal line. Which methods appear is exactly what Admin →
// Settings → Login Providers has switched on — and the social row sizes
// itself to that count (3 thirds, 2 halves, 1 full width), with every
// button swapping its icon for a spinner while its hop is in flight:
// clicked once it behaves as disabled (repeat activations swallowed),
// a back-button return clears the frozen arm (pageshow), and an arm
// that outlives a hop that never left expires on its own.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ALL_PROVIDERS,
  DEFAULT_PROVIDERS,
  fetchProviders,
  rememberNext,
  type ProviderFlags,
} from '@/lib/auth';
import { Spinner } from '@/components/auth/AuthUI';
import {
  CloseIcon,
  EnvelopeIcon,
  FacebookIcon,
  GoogleIcon,
  LinkedInIcon,
  PhoneIcon,
} from '@/components/auth/icons';

const SOCIALS = [
  { key: 'google', label: 'Google', color: '#DB4437', Icon: GoogleIcon },
  { key: 'facebook', label: 'Facebook', color: '#1877F2', Icon: FacebookIcon },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2', Icon: LinkedInIcon },
] as const;

export default function AuthWelcomePage() {
  const router = useRouter();
  // Built-in defaults first (the common case), the real flags as soon as
  // they land; every method if the fetch itself failed.
  const [providers, setProviders] = useState<ProviderFlags>(DEFAULT_PROVIDERS);
  // General settings (public endpoint): mascot + brand logos — uploaded in
  // Admin → Settings → General and served from object storage. Bundled
  // files stay as the fallback when nothing is configured or a URL dies.
  const [general, setGeneral] = useState<{
    bunnyImage?: string;
    primaryLogoLight?: string;
    primaryLogoDark?: string;
  }>({});
  // The button whose hop is in flight ('email' | 'phone' | a provider
  // key) — its icon becomes a spinner until the navigation unmounts the
  // sheet. Modifier-clicks never set it (they open a tab and return).
  const [launching, setLaunching] = useState<string | null>(null);

  useEffect(() => {
    // The page the visitor came from (the header's My Account button
    // sends ?next=/my-account, any future "sign in" link its own page) —
    // remembered for every later success landing. Arriving WITHOUT one
    // forgets the previous trip so a stale destination never hijacks a
    // fresh sign-in (§14.51).
    rememberNext(new URLSearchParams(window.location.search).get('next'));
  }, []);

  useEffect(() => {
    let alive = true;
    fetchProviders().then((p) => {
      if (alive) setProviders(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/api/settings/general')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.success && j.data) setGeneral(j.data);
      })
      .catch(() => {
        // ignore — bundled fallbacks stay
      });
    return () => {
      alive = false;
    };
  }, []);

  // The provider hop is a DOCUMENT navigation — browser Back can restore
  // the sheet from the back-forward cache exactly as it froze, spinner
  // (and the Email/Phone lock) still armed. pageshow fires on every
  // (re)load, so clearing there covers the restore case; a fresh load is
  // null already and a null→null set changes nothing.
  useEffect(() => {
    const restore = () => setLaunching(null);
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);

  // Safety valve: a hop that never leaves (stopped load, dead server)
  // must not disable the row forever — the arm expires on its own.
  useEffect(() => {
    if (!launching) return;
    const timer = setTimeout(() => setLaunching(null), 15_000);
    return () => clearTimeout(timer);
  }, [launching]);

  // Exactly the socials this deployment has switched on — the row sizes
  // itself from this list (3 fill as always, 2 split the row in half, 1
  // takes the whole width).
  const enabledSocials = SOCIALS.filter((s) => providers[s.key]);

  const anyMethod =
    providers.email || providers.emailLink || providers.phone ||
    providers.google || providers.facebook || providers.linkedin;

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#E6F6F5] dark:bg-[#0D0D0D] lg:flex-row">
      {/* Close → back to the site (top-left over the wash on desktop) */}
      <div className="px-6 pt-6 lg:absolute lg:left-8 lg:top-8 lg:z-10 lg:px-0 lg:pt-0">
        <Link
          href="/"
          aria-label="Close"
          title="Close"
          className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/70 text-[#1F2937] transition-colors hover:bg-white dark:bg-white/[0.08] dark:text-white/70 dark:hover:bg-white/[0.14]"
        >
          <CloseIcon className="h-5 w-5" />
        </Link>
      </div>

      {/* Tagline + floating mascot — on desktop the left panel keeps the
          light wash, the login page's decorative circles and copyright. */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-4 pt-6 lg:overflow-hidden lg:px-14 lg:pb-16 lg:pt-24">
        {/* Decorative circles — straight from the login page's left panel */}
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 hidden h-[300px] w-[300px] rounded-full bg-[rgba(3,69,72,0.06)] lg:block"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-[120px] -left-[60px] hidden h-[400px] w-[400px] rounded-full bg-[rgba(3,69,72,0.05)] lg:block"
        />
        <h1 className="text-center text-[28px] font-bold leading-[1.2] text-[#034548] dark:text-white/85 lg:max-w-[520px] lg:text-[36px] lg:leading-[1.25]">
          Your career, your life — all in one place
        </h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={general.bunnyImage || '/bunny.png'}
          alt=""
          aria-hidden="true"
          onError={(e) => {
            const el = e.currentTarget;
            if (!el.src.endsWith('/bunny.png')) el.src = '/bunny.png';
          }}
          className="mt-10 h-[200px] w-auto animate-[auth-float_2s_ease-in-out_infinite_alternate] object-contain lg:mt-14 lg:h-[320px] lg:drop-shadow-[0_20px_40px_rgba(3,69,72,0.15)]"
        />

        {/* Copyright — the login page's bottom branding */}
        <p className="absolute bottom-6 left-0 right-0 z-10 hidden text-center text-[0.8rem] text-[#034548] opacity-50 lg:block dark:text-white/40 dark:opacity-100">
          &copy; {new Date().getFullYear()} TELND. All rights reserved.
        </p>
      </div>

      {/* The sheet — bottom sheet on mobile, the right-hand panel on desktop */}
      <div className="rounded-t-[32px] bg-white px-7 pb-10 pt-9 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:bg-[#1C1C1E] lg:flex lg:w-[520px] lg:shrink-0 lg:flex-col lg:justify-center lg:rounded-none lg:border-l lg:border-black/5 lg:px-11 lg:shadow-none dark:lg:border-white/10">
        {/* Logo above the title, like the login page's right panel (desktop).
            Uploaded in Admin → Settings → General; the light slot hides at
            night when a dark variant exists, otherwise it rides a white
            plate so the navy wordmark stays readable. */}
        <div
          className={`mb-6 hidden w-fit lg:block ${
            general.primaryLogoDark
              ? 'dark:hidden'
              : 'dark:rounded-[16px] dark:bg-white dark:p-3'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={general.primaryLogoLight || '/TELND-Logo-3.png'}
            alt="TELND"
            onError={(e) => {
              const el = e.currentTarget;
              if (!el.src.endsWith('/TELND-Logo-3.png')) el.src = '/TELND-Logo-3.png';
            }}
            className="h-10 w-auto"
          />
        </div>
        {general.primaryLogoDark && (
          <div className="mb-6 hidden w-fit dark:lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={general.primaryLogoDark}
              alt="TELND"
              onError={(e) => {
                e.currentTarget.parentElement?.style.setProperty('display', 'none');
              }}
              className="h-10 w-auto"
            />
          </div>
        )}
        <h2 className="text-[24px] font-bold leading-tight text-[#1F2937] dark:text-[#F1F5F9]">
          Sign up or Log in
        </h2>
        <p className="mt-2 text-[14px] text-[#64748B] dark:text-white/50">
          Select your preferred method to continue
        </p>

        {!anyMethod ? (
          <p className="mt-7 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
            No sign-in methods are currently available. Please check back
            later.
          </p>
        ) : (
          <div className="mt-7">
            {(providers.email || providers.emailLink) && (
              <button
                type="button"
                onClick={() => {
                  if (launching) return;
                  setLaunching('email');
                  void router.push('/auth/email');
                }}
                disabled={launching !== null}
                className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-gradient-to-br from-[#034548] to-[#045E62] text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(3,69,72,0.3)] transition-opacity hover:opacity-95 dark:from-[#30A9A2] dark:to-[#045E62] dark:shadow-[0_4px_12px_rgba(48,169,162,0.3)] disabled:cursor-default disabled:opacity-70"
              >
                {launching === 'email' ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <EnvelopeIcon className="h-5 w-5" />
                )}
                Email
              </button>
            )}

            {providers.phone && (
              <button
                type="button"
                onClick={() => {
                  if (launching) return;
                  setLaunching('phone');
                  void router.push('/auth/phone');
                }}
                disabled={launching !== null}
                className="mt-3 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-[#034548] bg-white text-[15px] font-semibold text-[#034548] transition-colors hover:bg-[#F1F5F9] disabled:cursor-default disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-[#30A9A2] dark:hover:bg-white/10"
              >
                {launching === 'phone' ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <PhoneIcon className="h-5 w-5" />
                )}
                Phone Number
              </button>
            )}

            {enabledSocials.length > 0 && (
              <>
                <p className="mt-5 text-center text-[12px] text-[#94A3B8] dark:text-white/40">
                  or continue with
                </p>
                {/* One column per ENABLED provider, so the row always
                    fills its width: three thirds (the current look),
                    two halves, one full. Tailwind can't JIT a dynamic
                    class name — the template rides inline instead. */}
                <div
                  className="mt-4 grid gap-[10px]"
                  style={{
                    gridTemplateColumns: `repeat(${enabledSocials.length}, minmax(0, 1fr))`,
                  }}
                >
                  {enabledSocials.map(({ key, label, color, Icon }) => (
                    <a
                      key={key}
                      // Native navigation on purpose: the API's start
                      // endpoint sets the flow cookie and 302s straight
                      // to the provider — no fetch round-trip could
                      // carry that Set-Cookie through a redirect.
                      href={`/api/auth/oauth/${key}/start`}
                      aria-label={`Continue with ${label}`}
                      title={`Continue with ${label}`}
                      aria-disabled={launching === key}
                      className={`flex h-12 items-center justify-center gap-1.5 rounded-[12px] border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#1F2937] transition-colors hover:bg-[#F9FAFB] dark:border-white/[0.08] dark:bg-white/5 dark:text-white dark:hover:bg-white/10 ${
                        launching === key ? 'cursor-default opacity-70' : ''
                      }`}
                      onClick={(e) => {
                        // Modifier/middle clicks open a TAB and come
                        // straight back here — arming a spinner for a
                        // navigation that never leaves would strand it.
                        // Same-tab clicks arm it for the whole native
                        // hop out (API 302 → provider); any bounce back
                        // is a document load that resets the state.
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                        if (launching === key) {
                          // Already hopping — as disabled as an <a>
                          // gets: swallow the repeat activation
                          // (keyboard Enter included) instead of
                          // restarting the ride.
                          e.preventDefault();
                          return;
                        }
                        setLaunching(key);
                      }}
                    >
                      {launching === key ? (
                        <Spinner className="h-5 w-5" />
                      ) : (
                        <span style={{ color }}>
                          <Icon className="h-5 w-5" />
                        </span>
                      )}
                      {label}
                    </a>
                  ))}
                </div>
              </>
            )}

            <p className="mt-6 text-[11px] leading-[1.5] text-[#94A3B8] dark:text-white/[0.35]">
              By continuing, you agree to our{' '}
              <Link
                href="/terms-and-conditions"
                className="font-semibold text-[#034548] hover:underline dark:text-[#30A9A2]"
              >
                Terms &amp; Conditions
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy-policy"
                className="font-semibold text-[#034548] hover:underline dark:text-[#30A9A2]"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
