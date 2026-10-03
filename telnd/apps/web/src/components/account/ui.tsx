'use client';

// The My Account setup-page kit (§14.61) — one definition of the card
// every setup page wears (the overview card look: max-w-2xl, hairline
// border, p-6, the soft shadow, light + dark), the compact button styles
// and the Row/Chip pair. Pages import from here instead of restyling, so
// the setup pages cannot drift apart — the operator liked the overview
// card's shadow and wants every card to keep it.

import type { ReactNode } from 'react';

/** The setup card — same everywhere (light + dark). */
export const card =
  'max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5';

/** The card + the standard page-title rhythm (h1 carries its own margin). */
export const cardBlock = `mt-4 ${card}`;

export const primaryBtn =
  'inline-flex h-9 items-center rounded-[10px] bg-[#034548] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#025C5F] disabled:cursor-default disabled:opacity-60 dark:bg-[#30A9A2] dark:text-[#0D0D0D] dark:hover:bg-[#37bdb6]';

export const quietBtn =
  'inline-flex h-9 items-center gap-2 rounded-[10px] border border-gray-200 px-3.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-default disabled:opacity-60 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5';

export const dangerBtn =
  'inline-flex h-9 items-center gap-2 rounded-[10px] bg-red-600 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-default disabled:opacity-60';

/** Compact text input matching the card borders (forms use AuthInput for
 *  the tall auth-style fields; this is the in-card settings field). */
export const inputCls =
  'h-10 w-full rounded-[10px] border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-black/30 focus:border-[#034548] dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#30A9A2]';

/** One line of a settings list: label + detail on the left, action right. */
export function Row({
  title,
  detail,
  hint,
  aside,
}: {
  title: string;
  detail: ReactNode;
  hint?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="mt-0.5 break-all text-sm text-gray-600 dark:text-gray-400">{detail}</p>
        {hint && <p className="mt-1 text-[13px] leading-relaxed text-gray-500 dark:text-white/45">{hint}</p>}
      </div>
      {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
    </div>
  );
}

/** Status chip: green when good, amber when it somehow isn't. */
export function Chip({ tone, children }: { tone: 'ok' | 'warn'; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ${
        tone === 'ok'
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
      }`}
    >
      {children}
    </span>
  );
}

/** Confirmation notice under the page title (green) or inside a card. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div
      aria-live="polite"
      className="mt-4 max-w-2xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
    >
      {children}
    </div>
  );
}
