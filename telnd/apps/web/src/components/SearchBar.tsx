'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  suggestions?: string[];
  recentSearches?: string[];
  onSuggestionSelect?: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export function SearchBar({
  placeholder = 'Search...',
  value: controlledValue,
  onChange,
  onSearch,
  suggestions = [],
  recentSearches = [],
  onSuggestionSelect,
  size = 'md',
  className = '',
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const allItems = [
    ...recentSearches.map((s) => ({ type: 'recent' as const, label: s })),
    ...suggestions.map((s) => ({ type: 'suggestion' as const, label: s })),
  ];

  const filteredItems = value
    ? allItems.filter((i) => i.label.toLowerCase().includes(value.toLowerCase()))
    : allItems;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const sizes = {
    sm: 'px-3 py-1.5 text-sm pl-8',
    md: 'px-3.5 py-2 text-sm pl-9',
    lg: 'px-4 py-2.5 text-base pl-10',
  };

  const iconSizes = { sm: 'w-3.5 h-3.5 left-2.5', md: 'w-4 h-4 left-3', lg: 'w-5 h-5 left-3.5' };

  const handleChange = (v: string) => {
    setInternalValue(v);
    onChange?.(v);
    setOpen(v.length > 0 || filteredItems.length > 0);
    setActiveIndex(-1);
  };

  const handleSelect = (label: string) => {
    setInternalValue(label);
    onChange?.(label);
    onSuggestionSelect?.(label);
    onSearch?.(label);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none ${iconSizes[size]}`}>
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value) {
            onSearch?.(value);
            setOpen(false);
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, -1));
          }
          if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(filteredItems[activeIndex].label);
          }
        }}
        className={`w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white transition-colors ${sizes[size]}`}
      />
      {value && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <XIcon />
        </button>
      )}

      {open && filteredItems.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          <div className="py-1 max-h-56 overflow-y-auto">
            {!value && recentSearches.length > 0 && (
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Recent</div>
            )}
            {filteredItems.map((item, i) => (
              <button
                key={`${item.type}-${item.label}`}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors ${
                  i === activeIndex ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                } text-gray-700 dark:text-gray-300`}
                onClick={() => handleSelect(item.label)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {item.type === 'recent' ? <ClockIcon /> : <SearchIcon />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
