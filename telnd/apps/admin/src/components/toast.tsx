'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastTheme {
  color: string;
  tint: string;
  icon: ReactNode;
}

const THEMES: Record<ToastType, ToastTheme> = {
  success: {
    color: '#047857',
    tint: 'rgba(5, 150, 105, 0.28)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="8 12.5 11 15.5 16 9" />
      </svg>
    ),
  },
  error: {
    color: '#b91c1c',
    tint: 'rgba(220, 38, 38, 0.28)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  warning: {
    color: '#b45309',
    tint: 'rgba(217, 119, 6, 0.28)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13.5" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
};

interface ToastProps {
  type: ToastType;
  message: string;
  /** How long the toast stays visible, in milliseconds. */
  duration?: number;
  onDismiss: () => void;
}

/**
 * Compact popup shown at the top center of the screen (just below the top
 * bar) for `duration` ms.
 * White background with a soft shadow; icon and text colour follow the type.
 */
export default function Toast({ type, message, duration = 2000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    const hideTimer = setTimeout(() => setVisible(false), duration);
    const dismissTimer = setTimeout(() => dismissRef.current(), duration + 250);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(hideTimer);
      clearTimeout(dismissTimer);
    };
  }, [duration, type, message]);

  const theme = THEMES[type] ?? THEMES.success;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(var(--admin-header-height, 56px) + 12px)',
        left: '50%',
        transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, -8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        pointerEvents: 'none',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        width: 'max-content',
        maxWidth: '340px',
        padding: '0.625rem 0.875rem',
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        border: `1px solid ${theme.tint}`,
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.08)',
        fontSize: '0.8125rem',
        fontWeight: 600,
        lineHeight: 1.45,
        color: theme.color,
      }}
    >
      <span style={{ display: 'inline-flex', flexShrink: 0 }}>{theme.icon}</span>
      <span>{message}</span>
    </div>
  );
}
