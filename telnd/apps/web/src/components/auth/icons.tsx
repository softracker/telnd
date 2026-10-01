// Inline SVGs for the sign-in flow. The email/password glyphs are the
// exact assets the Flutter app ships (apps/mobile/assets/icons/*.svg),
// re-emitted with currentColor so CSS tints them the way the app's
// ColorFilter did; the three social marks instead wear their real brand
// logos — Google's four-color G, Facebook's blue circle-f, LinkedIn's
// blue in-badge — self-contained official colors that ignore
// currentColor. The rest are feather-style UI marks.

type IconProps = { className?: string };

function base(className?: string) {
  return {
    className,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

export function EnvelopeIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M2 6L8.91302 9.91697C11.4616 11.361 12.5384 11.361 15.087 9.91697L22 6" />
      <path d="M2.01577 13.4756C2.08114 16.5412 2.11383 18.0739 3.24496 19.2094C4.37608 20.3448 5.95033 20.3843 9.09883 20.4634C11.0393 20.5122 12.9607 20.5122 14.9012 20.4634C18.0497 20.3843 19.6239 20.3448 20.7551 19.2094C21.8862 18.0739 21.9189 16.5412 21.9842 13.4756C22.0053 12.4899 22.0053 11.5101 21.9842 10.5244C21.9189 7.45886 21.8862 5.92609 20.7551 4.79066C19.6239 3.65523 18.0497 3.61568 14.9012 3.53657C12.9607 3.48781 11.0393 3.48781 9.09882 3.53656C5.95033 3.61566 4.37608 3.65521 3.24495 4.79065C2.11382 5.92608 2.08114 7.45885 2.01576 10.5244C1.99474 11.5101 1.99475 12.4899 2.01577 13.4756Z" />
    </svg>
  );
}

export function PasswordIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M5 15C5 11.134 8.13401 8 12 8C15.866 8 19 11.134 19 15C19 18.866 15.866 22 12 22C8.13401 22 5 18.866 5 15Z" />
      <path d="M16.5 9.5V6.5C16.5 4.01472 14.4853 2 12 2C9.51472 2 7.5 4.01472 7.5 6.5V9.5" strokeLinecap="round" />
      <path d="M10.125 15H10M10.25 15C10.25 15.1381 10.1381 15.25 10 15.25C9.86193 15.25 9.75 15.1381 9.75 15C9.75 14.8619 9.86193 14.75 10 14.75C10.1381 14.75 10.25 14.8619 10.25 15Z" strokeLinecap="round" />
      <path d="M14.125 15H14M14.25 15C14.25 15.1381 14.1381 15.25 14 15.25C13.8619 15.25 13.75 15.1381 13.75 15C13.75 14.8619 13.8619 14.75 14 14.75C14.1381 14.75 14.25 14.8619 14.25 15Z" strokeLinecap="round" />
    </svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeLinecap="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function LinkedInIcon({ className }: IconProps) {
  // LinkedIn's real mark — the blue rounded square with the white "in".
  // Official colors on its own (like Google's G), so currentColor and
  // the shared stroke helpers stay out of it.
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden={true}>
      <rect width="40" height="40" rx="9" fill="#0A66C2" />
      <g transform="translate(8 8) scale(0.053571)" fill="#FFFFFF">
        <path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z" />
      </g>
    </svg>
  );
}

export function GoogleIcon({ className }: IconProps) {
  // Google's official mark — the four brand colors on their own viewBox.
  // It ignores currentColor and the shared stroke helpers on purpose: a
  // `currentColor` outline would tint over the real logo.
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden={true}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function FacebookIcon({ className }: IconProps) {
  // Facebook's real mark — the blue circle with the white f. Like the
  // other socials, its brand colors are its own: no currentColor, no
  // shared stroke helpers.
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden={true}>
      <circle cx="20" cy="20" r="20" fill="#1877F2" />
      <g transform="translate(11.97 7) scale(0.050781)" fill="#FFFFFF">
        <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
      </g>
    </svg>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeLinecap="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeLinecap="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeLinecap="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.45 18.45 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}
