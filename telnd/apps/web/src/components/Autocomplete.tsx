'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

interface AutocompleteOption {
  id: string;
  label: string;
  category?: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: string;
  onChange?: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Autocomplete({
  options,
  value: controlledValue,
  onChange,
  onSelect,
  placeholder = 'Type to search...',
  label,
  error,
  helperText,
  disabled = false,
  required = false,
  size = 'md',
  className = '',
}: AutocompleteProps) {
  const [internalValue, setInternalValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const displayValue = options.find((o) => o.id === value)?.label || internalValue;

  const filtered = useMemo(() => {
    if (!displayValue) return options;
    const q = displayValue.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.category?.toLowerCase().includes(q));
  }, [options, displayValue]);

  const grouped = useMemo(() => {
    const groups: Record<string, AutocompleteOption[]> = {};
    filtered.forEach((opt) => {
      const cat = opt.category || '';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(opt);
    });
    return groups;
  }, [filtered]);

  const hasCategories = filtered.some((o) => o.category);

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
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };

  const handleSelect = (opt: AutocompleteOption) => {
    setInternalValue(opt.label);
    onChange?.(opt.id);
    onSelect?.(opt);
    setOpen(false);
  };

  let itemIndex = -1;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          setInternalValue(e.target.value);
          onChange?.(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          const items = filtered;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
          } else if (e.key === 'Enter' && items[activeIndex]) {
            e.preventDefault();
            handleSelect(items[activeIndex]);
          }
        }}
        className={`w-full rounded-lg border bg-white dark:bg-gray-900 transition-colors ${sizes[size]} ${
          error
            ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
            : 'border-gray-300 dark:border-gray-700 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20'
        } focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
          <div className="py-1 max-h-56 overflow-y-auto">
            {hasCategories
              ? Object.entries(grouped).map(([cat, opts]) => (
                  <div key={cat || 'uncategorized'}>
                    {cat && (
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
                        {cat}
                      </div>
                    )}
                    {opts.map((opt) => {
                      itemIndex++;
                      const idx = itemIndex;
                      return (
                        <button
                          key={opt.id}
                          className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors ${
                            opt.id === value
                              ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400 font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          } ${idx === activeIndex ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                          onClick={() => handleSelect(opt)}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                ))
              : filtered.map((opt, i) => (
                  <button
                    key={opt.id}
                    className={`w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors ${
                      opt.id === value
                        ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    } ${i === activeIndex ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    {opt.label}
                  </button>
                ))}
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
