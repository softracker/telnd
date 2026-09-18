'use client';

import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect?: (id: string) => void;
  align?: 'left' | 'right';
  width?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  closeOnSelect?: boolean;
}

export function Dropdown({
  trigger,
  items,
  onSelect,
  align = 'left',
  width = 220,
  searchable = false,
  searchPlaceholder = 'Search...',
  closeOnSelect = true,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    if (!searchable || !search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.separator || i.label.toLowerCase().includes(q),
    );
  }, [items, search, searchable]);

  const visibleItems = filteredItems.filter((i) => !i.separator);
  const menuRef2 = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(0);
    setSearch('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, close]);

  useEffect(() => {
    if (open && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, searchable]);

  useEffect(() => {
    if (open && menuRef.current) {
      const els = menuRef.current.querySelectorAll('[data-menu-item]');
      els[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    const max = visibleItems.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => {
          let next = prev + 1;
          while (next < max && visibleItems[next]?.disabled) next++;
          return next < max ? next : prev;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && visibleItems[next]?.disabled) next--;
          return next >= 0 ? next : prev;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (visibleItems[activeIndex] && !visibleItems[activeIndex].disabled) {
          onSelect?.(visibleItems[activeIndex].id);
          if (closeOnSelect) close();
        }
        break;
    }
  };

  let itemIndex = -1;

  return (
    <div className="relative inline-block" ref={menuRef}>
      <div
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {open && (
        <div
          role="menu"
          className="absolute z-50 mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden"
          style={{ width, [align === 'right' ? 'right' : 'left']: 0 }}
        >
          {searchable && (
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
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-accent-500"
              />
            </div>
          )}
          <div className="py-1 max-h-64 overflow-y-auto">
            {filteredItems.map((item) => {
              if (item.separator) {
                return <div key={`sep-${item.id}`} className="my-1 border-t border-gray-100 dark:border-gray-800" />;
              }

              itemIndex++;
              const currentIndex = itemIndex;

              return (
                <button
                  key={item.id}
                  data-menu-item
                  role="menuitem"
                  disabled={item.disabled}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                    item.danger
                      ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  } ${item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${
                    currentIndex === activeIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                  onClick={() => {
                    if (!item.disabled) {
                      onSelect?.(item.id);
                      if (closeOnSelect) close();
                    }
                  }}
                  onMouseEnter={() => {
                    if (!item.disabled) setActiveIndex(currentIndex);
                  }}
                >
                  {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{item.shortcut}</span>
                  )}
                </button>
              );
            })}
            {visibleItems.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
