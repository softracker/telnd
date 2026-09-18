import { type InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, description, indeterminate, size = 'md', disabled, id, checked, ...props }, ref) => {
    const checkboxId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const sizes = {
      sm: 'w-4 h-4',
      md: 'w-[18px] h-[18px]',
      lg: 'w-5 h-5',
    };

    const isChecked = props.defaultChecked || checked;

    return (
      <label
        htmlFor={checkboxId}
        className={`inline-flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            disabled={disabled}
            className="peer sr-only"
            checked={checked}
            {...props}
          />
          <div className={`${sizes[size]} rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 transition-all peer-checked:border-accent-500 peer-checked:bg-accent-500 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500/30 peer-disabled:opacity-50`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="currentColor"
              className={`w-full h-full text-white p-[2px] transition-opacity ${isChecked ? 'opacity-100' : 'opacity-0'}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          {indeterminate && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-0.5 bg-white rounded-full" />
            </div>
          )}
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

Checkbox.displayName = 'Checkbox';

export { Checkbox };
export type { CheckboxProps };
