'use client';

import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';

export interface FormSelectOption {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface FormSelectProps {
  label?: string;
  placeholder?: string;
  options: FormSelectOption[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  width?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FormSelect({
  label,
  placeholder = 'Select...',
  options,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  searchable = false,
  width = '100%',
  size = 'md',
}: FormSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
    setActiveIndex(0);
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable && searchRef.current) searchRef.current.focus();
  }, [open, searchable]);

  useEffect(() => {
    if (open && containerRef.current) {
      const els = containerRef.current.querySelectorAll('[data-select-item]');
      els[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  return (
    <div className="relative" ref={containerRef} style={{ width }}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border bg-white dark:bg-gray-900 transition-colors text-left ${
          sizes[size]
        } ${
          error
            ? 'border-red-400 dark:border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20'
            : open
            ? 'border-accent-500 ring-2 ring-accent-500/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : 'cursor-pointer'}`}
      >
        <span className={`flex items-center gap-2 truncate ${selected ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
          {selected?.icon && <span className="w-4 h-4 shrink-0">{selected.icon}</span>}
          {selected ? selected.label : placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveIndex((prev) => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter' && filtered[activeIndex] && !filtered[activeIndex].disabled) {
                    e.preventDefault();
                    onChange(filtered[activeIndex].id);
                    close();
                  }
                }}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-accent-500"
              />
            </div>
          )}
          <div className="py-1 max-h-56 overflow-y-auto">
            {filtered.map((opt, i) => {
              const isSelected = opt.id === value;
              return (
                <button
                  key={opt.id}
                  data-select-item
                  type="button"
                  disabled={opt.disabled}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                    isSelected
                      ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400 font-medium'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${
                    i === activeIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                  onClick={() => {
                    if (!opt.disabled) {
                      onChange(opt.id);
                      close();
                    }
                  }}
                  onMouseEnter={() => !opt.disabled && setActiveIndex(i)}
                >
                  {opt.icon && <span className="w-4 h-4 shrink-0">{opt.icon}</span>}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 shrink-0 text-accent-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">No options found</div>
            )}
          </div>
        </div>
      )}

      {(helperText || error) && (
        <p className={`mt-1.5 text-xs ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}
