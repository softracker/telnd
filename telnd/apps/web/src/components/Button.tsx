import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'orange' | 'outline' | 'ghost' | 'danger' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      loading,
      disabled,
      icon,
      iconPosition = 'left',
      fullWidth,
      children,
      ...props
    },
    ref,
  ) => {
    const base =
      'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants: Record<string, string> = {
      primary:
        'bg-primary-700 text-white hover:bg-primary-600 active:bg-primary-800 focus-visible:outline-primary-700 shadow-sm hover:shadow-md',
      secondary:
        'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 focus-visible:outline-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600',
      accent:
        'bg-accent-500 text-white hover:bg-accent-400 active:bg-accent-600 focus-visible:outline-accent-500 shadow-sm hover:shadow-md',
      orange:
        'bg-orange-400 text-white hover:bg-orange-300 active:bg-orange-500 focus-visible:outline-orange-400 shadow-sm hover:shadow-md',
      outline:
        'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:outline-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100 dark:active:bg-gray-700',
      ghost:
        'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:outline-gray-400 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 dark:active:bg-gray-700',
      danger:
        'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 focus-visible:outline-red-600 shadow-sm hover:shadow-md',
      link:
        'bg-transparent text-accent-500 hover:text-accent-400 hover:underline active:text-accent-600 focus-visible:outline-accent-500 p-0',
    };

    const sizes: Record<string, string> = {
      xs: 'px-2.5 py-1 text-xs gap-1.5',
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2',
      xl: 'px-7 py-3 text-lg gap-2.5',
    };

    const iconOnly = icon && !children;
    const iconSizes: Record<string, string> = {
      xs: 'h-3.5 w-3.5',
      sm: 'h-4 w-4',
      md: 'h-4.5 w-4.5',
      lg: 'h-5 w-5',
      xl: 'h-6 w-6',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${iconOnly ? 'px-2' : ''} ${fullWidth ? 'w-full' : ''} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className={`${iconSizes[size]} animate-spin`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span className={iconSizes[size]}>{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className={iconSizes[size]}>{icon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
