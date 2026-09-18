import { type InputHTMLAttributes, forwardRef } from 'react';

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className = '', label, description, size = 'md', disabled, id, ...props }, ref) => {
    const radioId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-[18px] h-[18px]',
      lg: 'w-5 h-5',
    };

    return (
      <label
        htmlFor={radioId}
        className={`inline-flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            id={radioId}
            type="radio"
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div className={`${sizes[size]} rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 transition-all peer-checked:border-accent-500 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500/30 peer-disabled:opacity-50`}>
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform" />
            </div>
          </div>
        </div>
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>}
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
          </div>
        )}
      </label>
    );
  },
);

Radio.displayName = 'Radio';

export { Radio };
export type { RadioProps };
