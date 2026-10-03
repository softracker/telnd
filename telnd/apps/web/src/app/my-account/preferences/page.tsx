'use client';

// Preferences (§14.61) — the account's look, synced to the account. The
// portal ships in one language (English), so theme is the only knob the
// preferences API can honestly expose today: the choice is applied
// locally through the existing theme lib (localStorage + the .dark class
// the boot script reads) AND written to /api/user-preferences, so
// opening this page on another device pulls the saved value and applies
// it there too. Language can join later, when translations land.

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { authErrorMessage } from '@/lib/auth';
import { AuthError, Spinner } from '@/components/auth/AuthUI';
import { card } from '@/components/account/ui';
import { getTheme, setTheme, type Theme } from '@/lib/theme';

const OPTIONS: { value: Theme; label: string; detail: string }[] = [
  { value: 'system', label: 'System', detail: 'Follows your device setting.' },
  { value: 'light', label: 'Light', detail: 'Always the light theme.' },
  { value: 'dark', label: 'Dark', detail: 'Always the dark theme.' },
];

export default function PreferencesPage() {
  const [theme, setThemeChoice] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Server copy first — it is the cross-device truth; fall back to
      // whatever this browser already had when the row doesn't exist.
      let saved: Theme | null = null;
      try {
        const res = await api.get<{ data: { theme?: unknown } }>('/api/user-preferences');
        const value = res.data?.theme;
        if (value === 'light' || value === 'dark' || value === 'system') saved = value;
      } catch {
        // Offline or unauthenticated shell — local theme still renders.
      }
      if (cancelled) return;
      const applied = saved ?? getTheme();
      setThemeChoice(applied);
      if (saved) setTheme(saved); // pull this device onto the account's choice
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function choose(next: Theme) {
    if (!theme || saving || next === theme) return;
    const previous = theme;
    setThemeChoice(next);
    setTheme(next); // apply immediately — a failed save rolls back below
    setSaving(next);
    setError('');
    setNotice('');
    try {
      await api.put('/api/user-preferences', { theme: next });
      setNotice(`Theme set to ${OPTIONS.find((o) => o.value === next)?.label ?? next} — it follows your account.`);
    } catch (err) {
      setThemeChoice(previous);
      setTheme(previous);
      setError(authErrorMessage(err, 'Your preference could not be saved. Please try again.'));
    } finally {
      setSaving('');
    }
  }

  return (
    <>
      <h1>Preferences</h1>

      <div className={`mt-4 ${card}`}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Theme</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Light or dark — saved to your account, so every device you sign in on picks it up.
        </p>

        {loading && (
          <div className="flex min-h-[140px] items-center justify-center" role="status" aria-label="Loading your preferences">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {!loading && (
          <>
            {error && (
              <div className="mt-3">
                <AuthError>{error}</AuthError>
              </div>
            )}
            {notice && (
              <div
                aria-live="polite"
                className="mt-3 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                {notice}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {OPTIONS.map((option) => {
                const selected = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void choose(option.value)}
                    disabled={saving !== ''}
                    aria-pressed={selected}
                    className={`flex w-full items-center justify-between gap-3 rounded-[10px] border px-4 py-3 text-left transition-colors disabled:cursor-default disabled:opacity-60 ${
                      selected
                        ? 'border-[#034548] bg-[#034548]/5 dark:border-[#30A9A2] dark:bg-[#30A9A2]/10'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-white/15 dark:hover:bg-white/5'
                    }`}
                    title={`Use the ${option.label} theme`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
                      <span className="mt-0.5 block text-[13px] text-gray-600 dark:text-gray-400">{option.detail}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {saving === option.value && <Spinner className="h-4 w-4" />}
                      <span
                        aria-hidden="true"
                        className={`inline-block h-4 w-4 rounded-full border-2 ${
                          selected
                            ? 'border-[#034548] bg-[#034548] dark:border-[#30A9A2] dark:bg-[#30A9A2]'
                            : 'border-gray-300 dark:border-white/30'
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 text-[13px] text-gray-500 dark:text-white/45">
              <span>More preferences arrive here as the account grows.</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}
