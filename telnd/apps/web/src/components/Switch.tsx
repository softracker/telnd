import { forwardRef } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, label, description, disabled = false, size = 'md', className = '', id }, ref) => {
    const switchId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const sizes = {
      sm: { track: 'w-8 h-[18px]', thumb: 'w-3.5 h-3.5', translate: 'translate-x-4' },
      md: { track: 'w-10 h-5', thumb: 'w-4 h-4', translate: 'translate-x-5' },
      lg: { track: 'w-12 h-6', thumb: 'w-5 h-5', translate: 'translate-x-6' },
    };

    const s = sizes[size];

    return (
      <label
        htmlFor={switchId}
        className={`inline-flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <button
          ref={ref}
          id={switchId}
          role="switch"
          type="button"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`${s.track} rounded-full transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
            checked ? 'bg-accent-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`${s.thumb} block rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out mt-[2px] ml-[2px] ${
              checked ? s.translate : 'translate-x-0'
            }`}
          />
        </button>
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

Switch.displayName = 'Switch';

export { Switch };
export type { SwitchProps };
