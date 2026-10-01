// Client-side bus between the API layer's PIN challenge and the approval
// modal (§14.44). When a sensitive action answers PIN_REQUIRED /
// PIN_INVALID, api.ts asks here for a PIN; AdminLayout has a handler
// registered that opens the modal and resolves with the entered digits —
// or null when the user cancels (or no modal exists, e.g. server-side
// fetches), which surfaces the original error instead.

export type PinPromptReason = 'required' | 'invalid';
export type PinPromptHandler = (reason: PinPromptReason) => Promise<string | null>;

let handler: PinPromptHandler | null = null;

export function setPinPromptHandler(next: PinPromptHandler | null): void {
  handler = next;
}

export async function requestPinPrompt(reason: PinPromptReason): Promise<string | null> {
  if (typeof window === 'undefined' || !handler) return null;
  return handler(reason);
}

// A PIN created or dropped inside one component must show in the others
// without a page refresh: the lock screen's setup form sits on top of the
// Security card, which was keeping its mount-time snapshot and reading
// "No PIN set" after the overlay had just created one. Whoever changes
// the PIN announces here; listeners re-read /users/me/pin.
export const PIN_CHANGED_EVENT = 'telnd:security-pin-changed';

export function announcePinChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(PIN_CHANGED_EVENT));
}

// Screen-lock storage keys (§14.44). The lock flag lives in localStorage
// so it survives the browser closing; the trust marker lives in
// sessionStorage, which dies with it — that asymmetry is the whole trick:
// a plain refresh keeps trust (walks in), a closed-and-reopened browser
// never has it (locks — once the server confirms there is a PIN to ask
// for).
export const SCREEN_LOCK_KEY = 'telndAdminScreenLocked';
export const SESSION_TRUST_KEY = 'telndAdminPinTrusted';

/**
 * This browser session has proved itself — a fresh sign-in completed, or
 * the screen PIN was verified: drop the lock flag and remember the trust.
 * Called by auth-context on login/2FA completion and by AdminLayout on
 * unlock. Never call on a mere *visit* to a public page: a locked tab
 * that only looked at /login must stay locked.
 */
export function markSessionTrusted(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SCREEN_LOCK_KEY);
  sessionStorage.setItem(SESSION_TRUST_KEY, '1');
}

// Raised in THIS tab when the server answers SESSION_LOCKED (#33): the
// frozen session row is the authority now, and the local flags (most
// likely cleared to walk past the overlay) are re-set on the way up.
// Other tabs notice through the SCREEN_LOCK_KEY storage event as they
// always did; this tab has no storage event for itself, hence the name.
export const SESSION_LOCK_EVENT = 'telnd:screen-lock-raised';

export function raiseScreenLockLocally(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SCREEN_LOCK_KEY, '1');
  sessionStorage.removeItem(SESSION_TRUST_KEY);
  window.dispatchEvent(new Event(SESSION_LOCK_EVENT));
}
