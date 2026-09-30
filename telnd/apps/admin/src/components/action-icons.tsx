// Tiny inline SVGs for icon-only row actions (Edit / Delete / Confirm).
// Sizing comes from width/height so they center inside the 26px icon buttons.

const strokeProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function EditIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...strokeProps}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export function DeleteIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...strokeProps}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

// Second step of the two-click delete confirm — replaces the trash can.
export function ConfirmIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...strokeProps}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Rotate arrow for the password-regenerate row action.
export function RefreshIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...strokeProps}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

// Shield — the two-factor requirement row action on the Admins list.
export function ShieldIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...strokeProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

// Shield with a slash — turn an enrolled admin's own two-factor off
// from the Admins list (the plain Shield only dials the requirement).
export function ShieldOffIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...strokeProps}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  );
}

// Padlock — the screen-lock button at the foot of the side rail, and the
// glyph on the lock screen itself.
export function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...strokeProps}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// Key — the reset-PIN row action on the Admins list.
export function KeyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...strokeProps}>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
