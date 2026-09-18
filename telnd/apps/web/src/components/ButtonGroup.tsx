import { type HTMLAttributes, forwardRef } from 'react';

interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  attached?: boolean;
}

const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className = '', orientation = 'horizontal', attached = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        className={`inline-flex ${orientation === 'vertical' ? 'flex-col' : 'flex-row'} ${attached ? '[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:first-child):not(:last-child)]:rounded-none [&>button]:-ml-px [&>button:first-child]:ml-0' : 'gap-2'} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ButtonGroup.displayName = 'ButtonGroup';

export { ButtonGroup };
export type { ButtonGroupProps };
