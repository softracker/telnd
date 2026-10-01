'use client';

// Shared building blocks for the portal sign-in flow. Every visual value
// mirrors the Flutter design tokens (apps/mobile/lib/core/theme.dart):
// brand #034548 light / #30A9A2 dark, inputs filled #F1F5F9 (white 5% at
// night) with a 14px radius and a brand focus edge, 52px primary buttons,
// disabled #CBD5E1 (white 10% at night).

import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from './icons';

/**
 * Page shell for every sign-in step. On a phone it is the Flutter design
 * byte-for-byte (full-bleed white column). On desktop (≥768px) it becomes
 * the site's glow backdrop with the flow centred as a 440px card — same
 * content, no wall-to-wall stretching.
 *
 * Note: `.bg-glow` sets `contain: layout style`, which turns this shell into
 * a containing block for `position: fixed` descendants. Fixed overlays (the
 * forgot-password sheet) must be rendered *outside* the frame.
 */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-white md:justify-center md:bg-glow md:p-6 dark:bg-[#0D0D0D]">
      <div className="flex w-full max-w-[440px] flex-1 flex-col bg-white md:flex-none md:rounded-[24px] md:border md:border-black/5 md:shadow-[0_24px_64px_rgba(15,23,42,0.10)] dark:bg-[#0D0D0D] dark:md:border-white/10 dark:md:bg-[#1C1C1E]">
        {children}
      </div>
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
    </svg>
  );
}

/** Back chevron (top-left) + optional right-hand text action. */
export function AuthTopBar({
  backHref,
  action,
}: {
  backHref: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1">
      <Link
        href={backHref}
        aria-label="Go back"
        title="Go back"
        className="flex h-10 w-10 items-center justify-center rounded-[12px] text-[#1F2937] transition-colors hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
      >
        <ArrowLeftIcon className="h-5 w-5" />
      </Link>
      <div className="pr-2">{action}</div>
    </div>
  );
}

/** The top-right text action (Continue / Send OTP) — brand when live. */
export function TopAction({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-2 text-[15px] font-semibold transition-opacity ${
        disabled
          ? 'cursor-default text-black/25 dark:text-white/25'
          : 'text-[#034548] hover:opacity-80 dark:text-[#30A9A2]'
      }`}
    >
      {children}
    </button>
  );
}

/** Filled auth input with optional leading/trailing icon slots. */
export const AuthInput = forwardRef<
  HTMLInputElement,
  // Omit 'prefix' — React 19's HTMLAttributes claims the RDFa `prefix`
  // as a string, which would intersect our ReactNode slot into nonsense.
  Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> & {
    prefix?: ReactNode;
    suffix?: ReactNode;
    invalid?: boolean;
  }
>(function AuthInput({ prefix, suffix, invalid = false, className = '', ...props }, ref) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-black/[0.38] dark:text-white/[0.38]">
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        {...props}
        className={`h-[52px] w-full rounded-[14px] border bg-[#F1F5F9] px-[14px] text-[15px] text-[#1F2937] outline-none transition-colors placeholder:text-black/25 focus:border-[#034548] dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:border-[#30A9A2] ${
          invalid
            ? 'border-[#DC2626] dark:border-[#DC2626]'
            : 'border-transparent'
        } ${prefix ? 'pl-11' : ''} ${suffix ? 'pr-12' : ''} ${className}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</span>}
    </div>
  );
});

/** The 52px primary button — brand, gray while empty, spinner while busy. */
export function PrimaryButton({
  loading = false,
  disabled = false,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  const off = disabled && !loading;
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-[16px] font-semibold text-white transition-colors ${
        off
          ? 'cursor-default bg-[#CBD5E1] dark:bg-white/10'
          : 'bg-[#034548] hover:bg-[#023638] dark:bg-[#30A9A2] dark:hover:bg-[#268A84]'
      } ${loading ? 'opacity-90' : ''} ${className}`}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

/** Inline failure message (wiring needs a place for API errors to land). */
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] leading-relaxed text-[#B42318] dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
    >
      {children}
    </div>
  );
}

/**
 * The six OTP boxes (48×56, radius 12, 22px bold, auto-advance) with the
 * app's focus tint. `boxes` is six single-character slots so a cleared box
 * never shifts its neighbours; `onComplete` fires the moment all six fill.
 */
export function OtpBoxes({
  boxes,
  setBoxes,
  onComplete,
  disabled = false,
}: {
  boxes: string[];
  setBoxes: (next: string[]) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const lastCode = useRef('');

  useEffect(() => {
    if (boxes.length === 6 && boxes.every(Boolean)) {
      const code = boxes.join('');
      if (code !== lastCode.current) {
        lastCode.current = code;
        onComplete?.(code);
      }
    } else {
      lastCode.current = '';
    }
  }, [boxes, onComplete]);

  useEffect(() => {
    // Focus the first slot on arrival AND whenever the code resets: a
    // wrong code clears the boxes, and the retry starts here — not on
    // slot six where the cursor was left.
    if (boxes.every((b) => b === '')) refs.current[0]?.focus();
  }, [boxes]);

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = boxes.slice();
    next[index] = digit;
    setBoxes(next);
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !boxes[index] && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setBoxes(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  }

  return (
    <div className="flex justify-between" onPaste={handlePaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={boxes[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`Digit ${i + 1} of 6`}
          className="h-14 w-12 rounded-[12px] border border-transparent bg-[#F1F5F9] text-center text-[22px] font-bold text-[#1F2937] outline-none transition-colors focus:border-[#034548] disabled:opacity-60 dark:bg-white/5 dark:text-[#F1F5F9] dark:focus:border-[#30A9A2]"
        />
      ))}
    </div>
  );
}
