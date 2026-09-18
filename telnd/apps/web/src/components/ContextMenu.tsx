'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  children: ReactNode;
  items: ContextMenuItem[];
  onSelect?: (id: string) => void;
}

export function ContextMenu({ children, items, onSelect }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuItems = items.filter((i) => !i.separator);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const x = Math.min(e.clientX, window.innerWidth - 240);
      const y = Math.min(e.clientY, window.innerHeight - 300);
      setPosition({ x, y });
      setOpen(true);
      setActiveIndex(0);
    },
    [],
  );

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

    const handleScroll = () => close();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, close]);

  useEffect(() => {
    if (open && activeIndex >= 0 && menuRef.current) {
      const els = menuRef.current.querySelectorAll('[data-ctx-item]');
      els[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => {
          let next = prev + 1;
          while (next < menuItems.length && menuItems[next].disabled) next++;
          return next < menuItems.length ? next : prev;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && menuItems[next].disabled) next--;
          return next >= 0 ? next : prev;
        });
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0 && !menuItems[activeIndex].disabled) {
          onSelect?.(menuItems[activeIndex].id);
          close();
        }
        break;
    }
  };

  let itemIndex = -1;

  return (
    <>
      <div onContextMenu={handleContextMenu} className="inline-block">
        {children}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={handleKeyDown}
            className="fixed z-50 min-w-[200px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden animate-in fade-in zoom-in-95"
            style={{ left: position.x, top: position.y }}
          >
            <div className="py-1">
              {items.map((item) => {
                if (item.separator) {
                  return <div key={`sep-${item.id}`} className="my-1 border-t border-gray-100 dark:border-gray-800" />;
                }

                itemIndex++;
                const currentIndex = itemIndex;

                return (
                  <button
                    key={item.id}
                    data-ctx-item
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
                        close();
                      }
                    }}
                    onMouseEnter={() => !item.disabled && setActiveIndex(currentIndex)}
                  >
                    {item.icon && <span className="w-4 h-4 shrink-0">{item.icon}</span>}
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{item.shortcut}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
