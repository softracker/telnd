'use client';

import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';

export interface SelectOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface SelectSearchProps {
  options: SelectOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  maxSelected?: number;
  width?: number;
  renderSelected?: (ids: string[], options: SelectOption[]) => ReactNode;
}

export function SelectSearch({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  maxSelected,
  width = 300,
  renderSelected,
}: SelectSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      if (maxSelected && value.length >= maxSelected) return;
      onChange([...value, id]);
    }
  };

  const remove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const selectedOptions = options.filter((o) => value.includes(o.id));

  return (
    <div className="relative inline-block" ref={containerRef} style={{ width }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(!open)}
        className={`min-h-[40px] px-3 py-2 rounded-lg border cursor-pointer flex items-center gap-2 flex-wrap transition-colors ${
          open
            ? 'border-accent-500 ring-2 ring-accent-500/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        } bg-white dark:bg-gray-900`}
      >
        {selectedOptions.length === 0 && (
          <span className="text-sm text-gray-400 dark:text-gray-500">{placeholder}</span>
        )}
        {renderSelected
          ? renderSelected(value, options)
          : selectedOptions.map((opt) => (
              <span
                key={opt.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-500/10 text-accent-600 dark:text-accent-400 text-xs font-medium"
              >
                {opt.icon && <span className="w-3 h-3">{opt.icon}</span>}
                {opt.label}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(opt.id);
                  }}
                  className="ml-0.5 hover:text-accent-800 dark:hover:text-accent-200"
                >
                  ×
                </button>
              </span>
            ))}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-4 h-4 ml-auto shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input
              ref={searchRef}
              type="text"
              placeholder={searchPlaceholder}
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
                } else if (e.key === 'Enter' && filtered[activeIndex]) {
                  e.preventDefault();
                  toggle(filtered[activeIndex].id);
                }
              }}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-accent-500"
            />
          </div>
          <div className="py-1 max-h-52 overflow-y-auto">
            {filtered.map((opt, i) => {
              const isSelected = value.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  } ${i === activeIndex ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                  onClick={() => toggle(opt.id)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-accent-500 border-accent-500 text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </span>
                  {opt.icon && <span className="w-4 h-4 shrink-0">{opt.icon}</span>}
                  <span className="flex-1 text-left">{opt.label}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">No results</div>
            )}
          </div>
          {value.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-500">{value.length} selected</span>
              <button
                onClick={() => onChange([])}
                className="text-xs text-red-500 hover:text-red-600 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
