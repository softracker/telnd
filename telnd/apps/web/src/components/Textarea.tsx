import { type TextareaHTMLAttributes, forwardRef, useState, useEffect, useRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCount?: boolean;
  autoResize?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, helperText, maxLength, showCount = false, autoResize = false, size = 'md', required, disabled, value, id, onChange, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (internalRef as React.RefObject<HTMLTextAreaElement>);
    const [charCount, setCharCount] = useState(typeof value === 'string' ? value.length : 0);

    const sizes = {
      sm: 'px-3 py-1.5 text-sm min-h-[72px]',
      md: 'px-3.5 py-2 text-sm min-h-[88px]',
      lg: 'px-4 py-2.5 text-base min-h-[100px]',
    };

    useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
    }, [value, autoResize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={(node) => {
            (internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          id={textareaId}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          onChange={handleChange}
          className={`w-full rounded-lg border bg-white dark:bg-gray-900 transition-colors ${
            sizes[size]
          } ${
            error
              ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-gray-300 dark:border-gray-700 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20'
          } focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white resize-none ${
            disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''
          } ${className}`}
          {...props}
        />
        <div className="flex items-center justify-between mt-1.5">
          {(helperText || error) && (
            <p className={`text-xs ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {error || helperText}
            </p>
          )}
          {(showCount || maxLength) && (
            <p className={`text-xs ml-auto ${charCount >= (maxLength || Infinity) ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
              {maxLength ? `${charCount}/${maxLength}` : charCount}
            </p>
          )}
        </div>
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export { Textarea };
export type { TextareaProps };
