// Alpha.Net SMS (api.sms.net.bd) — one implementation shared by the
// balance proxy on the Gateway settings page and real message sending
// (2FA OTP codes). The gateway answers HTTP 200 for failures too, so
// success is decided from the body: every error payload carries a truthy
// `error` code plus a human `msg`.

const ALPHA_SMS_API = 'https://api.sms.net.bd';
const ALPHA_TIMEOUT_MS = 15000;

export interface AlphaResponse {
  error?: number | string | null;
  msg?: string;
  message?: string;
  status?: string | boolean;
  success?: boolean;
  balance?: number | string;
  wallet?: number | string;
  data?: { balance?: number | string };
}

export function alphaFailed(data: AlphaResponse | null): boolean {
  if (!data || typeof data !== 'object') return true;
  return Boolean(data.error) || data.success === false || data.status === 'error' || data.status === false;
}

export function alphaMessage(data: AlphaResponse | null): string | undefined {
  const msg = data?.msg || data?.message;
  return typeof msg === 'string' && msg.trim() ? msg.trim() : undefined;
}

export function alphaBalance(data: AlphaResponse | null): string | null {
  const raw = data?.balance ?? data?.wallet ?? data?.data?.balance;
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return null;
}

export async function callAlpha(
  path: string,
  init: RequestInit,
): Promise<{ data: AlphaResponse | null; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ALPHA_TIMEOUT_MS);
  try {
    const res = await fetch(`${ALPHA_SMS_API}${path}`, { ...init, signal: controller.signal });
    const data = (await res.json().catch(() => null)) as AlphaResponse | null;
    return { data, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST /sendsms (multipart) with the caller's API key. `to` must already be
 * in international form ("88017…"). Never throws — the caller decides how
 * to surface `{ ok: false, message }`.
 */
export async function sendAlphaSms(
  apiKey: string,
  to: string,
  msg: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const form = new FormData();
    form.append('api_key', apiKey);
    form.append('msg', msg);
    form.append('to', to);
    const { data, status } = await callAlpha('/sendsms', { method: 'POST', body: form });
    if (status < 200 || status >= 300 || alphaFailed(data)) {
      return { ok: false, message: alphaMessage(data) || `Gateway responded with status ${status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Could not reach the SMS gateway' };
  }
}
