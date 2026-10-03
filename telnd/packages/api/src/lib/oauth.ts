import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@telnd/database';
import { portalUrl } from './passwordTokens';

// ── Social sign-in plumbing (§14.48) ──────────────────────────────────────
//
// The three doors the Login Providers page can open (Google / Facebook /
// LinkedIn), their protocol endpoints and the rules around what a
// provider's answers are allowed to mean:
//
// - Identity is `(provider, sub)` — the immutable subject, never the
//   email (§ schema UserIdentity).
// - A provider's `email` may only be ATTACHED or used to route to the
//   link-proof screen when it comes back **verified**: the OIDC claim
//   `email_verified === true` (Google and LinkedIn both send it, and
//   Google explicitly sends `false` when it doesn't hold), with one
//   documented exception — Facebook's Graph API has no such claim but its
//   contract only ever exposes confirmed addresses ("the email field is
//   only available if the user's email address has been verified"), so an
//   ABSENT claim counts as verified there and only there. An explicit
//   `false` is never trusted, anywhere.
// - Exchange is server-side with PKCE (S256) everywhere except LinkedIn —
//   see pkceSupported(): LinkedIn has no PKCE at all. The authorization
//   `code` never reaches any endpoint other than the exchange. Access + ID
//   tokens are used once, to fetch the profile, and dropped — nothing
//   token-shaped is written anywhere (no column even exists for it).
//
// Test seam (outside production only): the token and userinfo URLs can be
// redirected to a local fake provider so the whole handshake is testable
// without real credentials or outbound calls. Honored in production: no.

export type OAuthProvider = 'google' | 'facebook' | 'linkedin';

export const OAUTH_PROVIDERS: readonly OAuthProvider[] = ['google', 'facebook', 'linkedin'];

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

interface ProviderDef {
  authorizeUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  scopes: string[];
}

export const OAUTH_REGISTRY: Record<OAuthProvider, ProviderDef> = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userinfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: ['openid', 'email', 'profile'],
  },
  facebook: {
    authorizeUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
    userinfoUrl: 'https://graph.facebook.com/me?fields=id,name,email',
    scopes: ['public_profile', 'email'],
  },
  linkedin: {
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userinfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scopes: ['openid', 'profile', 'email'],
  },
};

/** Flow failure with a route-safe code — never carries raw provider output. */
export class OAuthFlowError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'OAuthFlowError';
    this.code = code;
  }
}

function testOverride(kind: 'tokenUrl' | 'userinfoUrl', fallback: string): string {
  if (process.env.NODE_ENV === 'production') return fallback;
  const v = process.env[kind === 'tokenUrl' ? 'OAUTH_TEST_TOKEN_URL' : 'OAUTH_TEST_USERINFO_URL'];
  return typeof v === 'string' && /^https?:\/\//.test(v) ? v : fallback;
}

/** Stored credentials + the switch (§14.45 Login Providers page). */
export interface OAuthClientConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
}

/**
 * Credential-carrying providers are OFF unless the settings row says
 * enabled — never "default on" like the built-ins, because a missing
 * credential is not a working method. Unreadable settings → off.
 */
export async function oauthClientConfig(provider: OAuthProvider): Promise<OAuthClientConfig> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'loginProviders' } });
    const stored = (row?.value as Record<string, any> | null)?.[provider];
    const pick = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    return {
      enabled: stored?.enabled === true,
      clientId: pick(stored?.clientId),
      clientSecret: pick(stored?.clientSecret),
    };
  } catch {
    return { enabled: false, clientId: '', clientSecret: '' };
  }
}

/**
 * The redirect URI — it must match the value registered at the provider
 * to the character (the settings page shows exactly this string to copy
 * into the console). Site URL from General settings; falls back to the
 * portal's own origin when unset (local dev).
 */
export async function oauthRedirectUri(provider: OAuthProvider): Promise<string> {
  let base = '';
  try {
    const row = await prisma.setting.findUnique({ where: { key: 'general' } });
    const siteUrl = (row?.value as { siteUrl?: unknown } | null)?.siteUrl;
    if (typeof siteUrl === 'string' && siteUrl.trim()) base = siteUrl.trim();
  } catch {
    // fall through to the portal origin
  }
  if (!base) base = portalUrl('').replace(/\/+$/, '');
  return `${base.replace(/\/+$/, '')}/auth/callback/${provider}`;
}

/** PKCE pair (RFC 7636): verifier stays in the state cookie, challenge rides the authorize URL. */
export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/**
 * PKCE everywhere EXCEPT LinkedIn — the one provider that never
 * implemented RFC 7636. LinkedIn's authorize endpoint silently drops
 * `code_challenge`, then its token endpoint fails the "appid/redirect uri
 * code verifier does not match authorization code" comparison when a
 * verifier arrives anyway, killing every sign-in at the exchange with a
 * bare 400 (observed live, and the same failure reported upstream at
 * directus/directus#26743 — Google works because Google does PKCE).
 * Google and Facebook keep it: Meta documents S256 explicitly for
 * Facebook Login. Start and exchange must both call this — half-sending
 * PKCE is the bug this function exists to prevent. LinkedIn's exchange
 * still carries the client secret, so the code is not left unguarded.
 */
export function pkceSupported(provider: OAuthProvider): boolean {
  return provider !== 'linkedin';
}

/** 192 bits of URL-safe state — the flow's correlation + CSRF guard. */
export function randomOAuthToken(): string {
  return randomBytes(24).toString('base64url');
}

// ── Server-side single-use for the flow cookie ──────────────────────────
// The cookie is a signed JWT, so deleting the browser's copy is not
// enough: anyone who captured the Set-Cookie could replay it inside the
// 10-minute window (a rival tab, a pasted callback URL). First read burns
// the jti; every later attempt finds it spent. In-memory like every auth
// ephemeral here (§ signupIntents — single instance, cookie exp bounds
// the set anyway, and this map prunes itself).
const spentFlowJtis = new Map<string, number>();

export function burnFlowJti(jti: string): boolean {
  const now = Date.now();
  for (const [key, expiresAt] of spentFlowJtis) {
    if (expiresAt <= now) spentFlowJtis.delete(key);
  }
  if (spentFlowJtis.has(jti)) return false;
  spentFlowJtis.set(jti, now + 11 * 60 * 1000); // cookie's 10-min exp + slack
  return true;
}

/** The authorization URL the browser is sent to (start endpoint builds this). */
export function buildAuthorizeUrl(params: {
  provider: OAuthProvider;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const def = OAUTH_REGISTRY[params.provider];
  const url = new URL(def.authorizeUrl);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', def.scopes.join(' '));
  url.searchParams.set('state', params.state);
  if (pkceSupported(params.provider)) {
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
  }
  if (params.provider !== 'facebook') {
    // OIDC nonce — Facebook has no OIDC layer and rejects unknown params.
    url.searchParams.set('nonce', params.nonce);
  }
  if (params.provider === 'google') {
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('access_type', 'online');
  }
  if (params.provider === 'linkedin') {
    // LinkedIn wants response_type code and nothing else, but state is
    // mandatory there too — already set above.
  }
  return url.toString();
}

export interface OAuthProfile {
  /** The provider's immutable subject. */
  sub: string;
  /** Provider-reported address (may be null — never invented). */
  email: string | null;
  /** Whether that address may be ATTACHED / used for link detection. */
  emailVerified: boolean;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
}

/**
 * Normalize a provider's userinfo answer into the one shape the routes
 * consume. Where the `email_verified` claim decides trust:
 * boolean claim wins (so Google's explicit `false` is honored), Facebook's
 * absent claim counts as verified (platform contract — see header), every
 * other absence is UNVERIFIED.
 */
export function normalizeProfile(provider: OAuthProvider, raw: unknown): OAuthProfile {
  const rec = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const sub = typeof rec.sub === 'string' && rec.sub
    ? rec.sub
    : typeof rec.id === 'string' && rec.id
      ? rec.id
      : '';
  if (!sub) {
    throw new OAuthFlowError('OAUTH_PROFILE_INVALID', 'The provider did not return a subject id.');
  }

  const emailRaw = typeof rec.email === 'string' ? rec.email.trim() : '';
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : null;
  const claim = typeof rec.email_verified === 'boolean' ? rec.email_verified : undefined;
  const emailVerified =
    email !== null && (claim === true || (claim === undefined && provider === 'facebook'));

  const name = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : null;
  const givenName =
    typeof rec.given_name === 'string' && rec.given_name.trim()
      ? rec.given_name.trim()
      : name
        ? name.split(/\s+/)[0]!
        : null;
  const familyName =
    typeof rec.family_name === 'string' && rec.family_name.trim()
      ? rec.family_name.trim()
      : name
        ? name.split(/\s+/).slice(1).join(' ') || null
        : null;

  return { sub, email, emailVerified, name, givenName, familyName };
}

/**
 * Server-side code exchange: one POST to the token endpoint (with the
 * PKCE verifier where the provider implements PKCE — see
 * pkceSupported(); the client secret rides too, so the code is useless to
 * anyone who intercepts it), then one authenticated GET for the profile.
 * Both responses are discarded after this function returns: the caller
 * receives only the normalized profile, never a token.
 */
export async function exchangeCodeForProfile(params: {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<OAuthProfile> {
  const def = OAUTH_REGISTRY[params.provider];
  const tokenUrl = testOverride('tokenUrl', def.tokenUrl);
  const userinfoUrl = testOverride('userinfoUrl', def.userinfoUrl);

  let tokenResp: Response;
  try {
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    });
    if (pkceSupported(params.provider)) form.set('code_verifier', params.codeVerifier);
    tokenResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
  } catch {
    throw new OAuthFlowError(
      'OAUTH_EXCHANGE_FAILED',
      'The sign-in provider could not be reached. Please try again.',
    );
  }

  const tokenBody = (await tokenResp.json().catch(() => null)) as {
    access_token?: string;
    error?: string;
  } | null;
  if (!tokenResp.ok || !tokenBody?.access_token) {
    console.error(
      `[oauth] token exchange failed for ${params.provider}: ${tokenResp.status} ${tokenBody?.error ?? 'unknown_error'}`,
    );
    throw new OAuthFlowError(
      'OAUTH_EXCHANGE_FAILED',
      'The sign-in request could not be completed. Please try again.',
    );
  }

  let profileResp: Response;
  try {
    profileResp = await fetch(userinfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenBody.access_token}`,
        Accept: 'application/json',
      },
    });
  } catch {
    throw new OAuthFlowError(
      'OAUTH_EXCHANGE_FAILED',
      'The sign-in provider could not be reached. Please try again.',
    );
  }
  if (!profileResp.ok) {
    console.error(`[oauth] userinfo failed for ${params.provider}: ${profileResp.status}`);
    throw new OAuthFlowError(
      'OAUTH_EXCHANGE_FAILED',
      'The sign-in provider did not return an identity. Please try again.',
    );
  }
  const profile = await profileResp.json().catch(() => null);
  if (!profile || typeof profile !== 'object') {
    throw new OAuthFlowError('OAUTH_PROFILE_INVALID', 'The provider returned an unreadable identity.');
  }
  return normalizeProfile(params.provider, profile);
}
