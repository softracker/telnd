// Browser → same-origin: fetch('/api/…') is carried to the API by the
// rewrite proxy in next.config.ts, which is the only scheme that survives
// an HTTPS tunnel (a direct http://localhost:3001 call from an https page
// is blocked as mixed content, refused by CORS, and its SameSite=Lax
// cookie never crosses sites). Server → direct to the API; server-side
// fetches run on this machine, so localhost works behind any tunnel.
import { requestPinPrompt, raiseScreenLockLocally } from './security-pin';

const API_BASE_URL =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    : '';

interface RequestOptions extends RequestInit {
  token?: string;
  /** Attached once the PIN modal approved — internal, set by the retry. */
  pin?: string;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, pin, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);

  if (!(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (pin) {
    headers.set('X-Admin-Pin', pin);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
    // Never read a stored body for an API call: a write followed by a
    // refetch must see the post-write state (Firefox otherwise serves the
    // pre-write GET body from cache and the UI stays stale).
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    // Sensitive endpoints answer PIN_REQUIRED / PIN_INVALID when the actor
    // has a security PIN on file (§14.44). Open the approval modal and
    // retry this exact request once with the verified PIN — one choke
    // point, so every present and future sensitive action is covered.
    // Setup/verify are excluded: there the check IS the request (the lock
    // screen would loop forever otherwise). The self-service disable —
    // DELETE /users/me/pin — is a sensitive action like any other and
    // deliberately stays inside the flow. FormData bodies are re-sendable
    // (the fetch serializes the same fields on each attempt), so uploads
    // get the approval retry too — excluding them silently dropped PIN
    // approval on every multipart mutation (#32).
    const code = data?.error?.code;
    // The session is frozen server-side (#33) — almost always because
    // someone cleared the storage flags to walk past the lock screen.
    // This request fails either way; re-raise the lock locally so the
    // app stops talking to a session the server refuses.
    if (code === 'SESSION_LOCKED' && typeof window !== 'undefined') {
      raiseScreenLockLocally();
    }
    const isPinChallenge = code === 'PIN_REQUIRED' || code === 'PIN_INVALID';
    const isPinSelfCheck =
      endpoint.endsWith('/users/me/pin/verify') ||
      // The lock screen's own thaw: it renders its own PIN row and error
      // handling, so the approval modal must not sit on top of it (#33).
      endpoint.endsWith('/auth/session/unlock') ||
      (endpoint.endsWith('/users/me/pin') && fetchOptions.method !== 'DELETE');
    if (
      isPinChallenge &&
      !isPinSelfCheck &&
      options.pin === undefined &&
      typeof window !== 'undefined'
    ) {
      const approved = await requestPinPrompt(code === 'PIN_INVALID' ? 'invalid' : 'required');
      if (approved !== null) {
        return apiRequest<T>(endpoint, { ...options, pin: approved });
      }
    }
    throw new ApiError(
      data?.error?.message || data?.message || `API error: ${response.status}`,
      response.status,
      data,
    );
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    apiRequest<T>(endpoint, { method: 'GET', token }),

  post: <T>(endpoint: string, body: unknown, token?: string) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      token,
    }),

  put: <T>(endpoint: string, body: unknown, token?: string) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      token,
    }),

  patch: <T>(endpoint: string, body: unknown, token?: string) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      token,
    }),

  delete: <T>(endpoint: string, body?: unknown, token?: string) =>
    apiRequest<T>(endpoint, {
      method: 'DELETE',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      token,
    }),

  upload: <T>(endpoint: string, formData: FormData, token?: string) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: formData,
      token,
    }),

  /**
   * DELETE that keeps running through page unload (tab close / refresh).
   * Used to clean up images that were uploaded but never saved.
   */
  deleteKeepalive: (endpoint: string, body: unknown): Promise<void> =>
    fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
      keepalive: true,
    }).then(
      () => undefined,
      () => undefined,
    ),
};
