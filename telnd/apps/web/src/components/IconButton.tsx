import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'orange' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tooltip?: string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className = '', variant = 'ghost', size = 'md', tooltip, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants: Record<string, string> = {
      primary: 'bg-primary-700 text-white hover:bg-primary-600 active:bg-primary-800 focus-visible:outline-primary-700',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 focus-visible:outline-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
      accent: 'bg-accent-500 text-white hover:bg-accent-400 active:bg-accent-600 focus-visible:outline-accent-500',
      orange: 'bg-orange-400 text-white hover:bg-orange-300 active:bg-orange-500 focus-visible:outline-orange-400',
      outline: 'border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:outline-gray-400 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:outline-gray-400 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 focus-visible:outline-red-600',
    };

    const sizes: Record<string, string> = {
      xs: 'h-7 w-7',
      sm: 'h-8 w-8',
      md: 'h-9 w-9',
      lg: 'h-10 w-10',
    };

    const iconSizes: Record<string, string> = {
      xs: 'h-3.5 w-3.5',
      sm: 'h-4 w-4',
      md: 'h-4.5 w-4.5',
      lg: 'h-5 w-5',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        title={tooltip}
        {...props}
      >
        <span className={iconSizes[size]}>{children}</span>
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

export { IconButton };
export type { IconButtonProps };
