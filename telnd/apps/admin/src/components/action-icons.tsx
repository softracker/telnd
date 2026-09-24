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
