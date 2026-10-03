'use client';

// Second half of the social handshake (§14.48). The provider redirected
// here with ?code&state — or ?error when the visitor cancelled at the
// consent screen — and this page's only job is to hand the code back to
// the API: the exchange, the account resolution and the session all
// happen server-side (PKCE included; this page never sees a token). The
// answer names where to land:
//
//   (no flags)      → '/'                 fresh session, cookies set
//   requires2FA     → '/auth/2fa'         a local second factor is pending
//   requiresLink    → '/auth/link?...'    an account holds this verified
//                                         email — prove it to connect
//   connect ok      → '/my-account/sign-in-methods?connected=…  (§14.63)
//   connect failed  → '/my-account/sign-in-methods?error=…      (§14.63)
//
// Connect mode (§14.63) never touches this screen's own states: the
// panel's flow both STARTS and ENDS on the panel — success, refusal,
// cancellation and expiry all land there as a message, so a connect can
// never end on a sign-in screen (or sign anyone into anything). The
// intent is read from the state's `.c` suffix, because the redirect_uri
// is an exact-match registration and can't carry a query of its own.

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { authErrorCode, authErrorMessage, landingPath } from '@/lib/auth';
import {
  AuthFrame,
  AuthTopBar,
  PrimaryButton,
  Spinner,
} from '@/components/auth/AuthUI';

const PROVIDERS: Record<string, string> = {
  google: 'Google',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

export default function AuthOAuthCallbackPage() {
  const router = useRouter();
  const params = useParams<{ provider?: string }>();
  const provider = typeof params?.provider === 'string' ? params.provider : '';
  const [failed, setFailed] = useState('');
  const [connecting, setConnecting] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const label = PROVIDERS[provider];
    const fail = (message: string) => setFailed(message);
    if (!label) {
      fail('That sign-in provider is not supported.');
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const providerError = query.get('error');
    const code = query.get('code');
    const state = query.get('state');
    const connect = (state ?? '').endsWith('.c');
    setConnecting(connect);
    const backToPanel = (message: string) =>
      router.replace(`/my-account/sign-in-methods?error=${encodeURIComponent(message)}`);

    if (providerError) {
      // The provider's own answer (cancelled consent, denied scope) —
      // nothing was exchanged, nothing was created.
      const cancelled = providerError === 'access_denied';
      if (connect) {
        backToPanel(
          cancelled
            ? `You cancelled the ${label} connection. Nothing was changed.`
            : `The ${label} connection was refused (${providerError}). Please try again.`,
        );
        return;
      }
      fail(
        cancelled
          ? `You cancelled the ${label} sign-in. Nothing was changed.`
          : `The ${label} sign-in was refused (${providerError}). Please try again.`,
      );
      return;
    }
    if (!code || !state) {
      if (connect) {
        backToPanel('The connection response is incomplete. Please start again.');
        return;
      }
      fail('The sign-in response is incomplete. Please start again.');
      return;
    }

    api
      .post<{
        data?: {
          requires2FA?: boolean;
          requiresLink?: boolean;
          linkToken?: string;
          email?: string;
          mode?: string;
        };
      }>(`/api/auth/oauth/${provider}/verify`, { code, state })
      .then((res) => {
        const data = res?.data;
        if (data?.mode === 'connect') {
          router.replace(`/my-account/sign-in-methods?connected=${provider}`);
          return;
        }
        if (data?.requires2FA) {
          router.replace('/auth/2fa');
          return;
        }
        if (data?.requiresLink && data.linkToken) {
          router.replace(
            `/auth/link?provider=${provider}&token=${encodeURIComponent(data.linkToken)}&email=${encodeURIComponent(data.email ?? '')}`,
          );
          return;
        }
        router.replace(landingPath());
      })
      .catch((err) => {
        if (connect) {
          backToPanel(authErrorMessage(err, `The ${label} connection could not be completed. Please try again.`));
          return;
        }
        const code_ = authErrorCode(err);
        if (code_ === 'OAUTH_STATE_INVALID' || code_ === 'OAUTH_LINK_INVALID') {
          fail('This sign-in attempt could not be verified. Please start again.');
          return;
        }
        fail(authErrorMessage(err, `The ${label} sign-in could not be completed. Please try again.`));
      });
    // provider is the route's identity — mounting happens once per callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthFrame>
      <div className="pt-4">
        <AuthTopBar backHref="/auth" />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-6">
        {failed ? (
          /* Terminal state, same geometry as the other "start again"
             screens: the block fills the card so the message centres in
             the space a form would occupy, and py-10 keeps the button
             off the card's bottom edge — the desktop card is auto-height,
             so without that padding the button landed flush on the
             rounded edge (browser report). */
          <div className="flex min-h-[260px] flex-1 flex-col justify-center py-10 text-center">
            <h1 className="text-[24px] font-bold text-[#1F2937] dark:text-[#F1F5F9]">
              Sign-in didn&apos;t finish
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B] dark:text-white/50">
              {failed}
            </p>
            <div className="mt-8">
              <PrimaryButton type="button" onClick={() => router.replace('/auth')}>
                Back to sign in
              </PrimaryButton>
            </div>
          </div>
        ) : (
          /* Loading: the body fills the card and the block centres in
             it — on the auto-height desktop card min-h keeps real room
             under the top bar, so the spinner sits in the MIDDLE of the
             card instead of pinned below it (browser report). */
          <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center gap-4 py-10 text-[#034548] dark:text-[#30A9A2]">
            <Spinner className="h-8 w-8" />
            <p className="text-[14px] text-[#64748B] dark:text-white/50">
              {connecting ? 'Connecting your account…' : 'Completing your sign-in…'}
            </p>
          </div>
        )}
      </div>
    </AuthFrame>
  );
}
