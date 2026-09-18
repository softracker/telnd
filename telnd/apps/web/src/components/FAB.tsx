import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'orange' | 'danger';
  size?: 'md' | 'lg';
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  label?: string;
}

const FAB = forwardRef<HTMLButtonElement, FABProps>(
  ({ className = '', variant = 'primary', size = 'md', position = 'bottom-right', label, children, ...props }, ref) => {
    const base =
      'fixed z-40 inline-flex items-center justify-center rounded-full font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants: Record<string, string> = {
      primary: 'bg-primary-700 text-white hover:bg-primary-600 focus-visible:outline-primary-700',
      accent: 'bg-accent-500 text-white hover:bg-accent-400 focus-visible:outline-accent-500',
      orange: 'bg-orange-400 text-white hover:bg-orange-300 focus-visible:outline-orange-400',
      danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-600',
    };

    const sizes: Record<string, string> = {
      md: 'h-14 w-14',
      lg: 'h-16 w-16',
    };

    const iconSizes: Record<string, string> = {
      md: 'h-6 w-6',
      lg: 'h-7 w-7',
    };

    const positions: Record<string, string> = {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${positions[position]} ${label ? 'rounded-2xl w-auto px-5 gap-2' : ''} ${className}`}
        {...props}
      >
        <span className={iconSizes[size]}>{children}</span>
        {label && <span className="text-sm">{label}</span>}
      </button>
    );
  },
);

FAB.displayName = 'FAB';

export { FAB };
export type { FABProps };
