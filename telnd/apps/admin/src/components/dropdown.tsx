'use client';

import { useEffect, useId, useRef, useState } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
}

// Modern listbox-style dropdown (button trigger + floating menu) replacing
// native <select>. The menu is position: fixed (measured when it opens) so it
// never gets clipped by scrollable cards/modals; it closes on outside click,
// Escape, blur-out, page scroll, or resize.
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = '—',
  ariaLabel,
  disabled = false,
  height = 36,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  height?: number;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Keyboard activation synthesizes a trailing click on the trigger — ignore it.
  const ignoreClickUntilRef = useRef(0);
  const listId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : placeholder;
  const usable = !disabled && options.length > 0;

  function openMenu() {
    if (!usable) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Open downward unless there isn't room — then upward from the trigger.
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(240, openUp ? spaceAbove : spaceBelow));
    setMenuPos(
      openUp
        ? { bottom: window.innerHeight - (rect.top - 6), left: rect.left, width: rect.width, maxHeight }
        : { top: rect.bottom + 6, left: rect.left, width: rect.width, maxHeight },
    );
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function closeMenu(focusTrigger = false) {
    setOpen(false);
    setMenuPos(null);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function choose(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    ignoreClickUntilRef.current = Date.now() + 350;
    closeMenu(true);
  }

  // Outside click + Escape; close when the page scrolls/resizes (the menu is
  // fixed-positioned, so it would otherwise detach from the trigger). Scroll
  // events from inside the menu itself are ignored.
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) closeMenu();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu(true);
    }
    function onScrollOrResize(e: Event) {
      if (containerRef.current?.contains(e.target as Node)) return;
      closeMenu();
    }
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the keyboard-highlighted option in view inside the menu.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!usable) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ignoreClickUntilRef.current = Date.now() + 350;
        openMenu();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(activeIndex);
    }
  }

  return (
    <div
      ref={containerRef}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) closeMenu();
      }}
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (Date.now() < ignoreClickUntilRef.current) return;
          open ? closeMenu() : openMenu();
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        title={selectedLabel}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          width: '100%',
          height,
          padding: '0 0.625rem',
          borderRadius: '8px',
          border: '1px solid var(--input-border)',
          backgroundColor: 'var(--input-bg)',
          color: selectedIndex >= 0 ? 'var(--text-main)' : 'var(--muted-text)',
          fontSize: '0.8125rem',
          outline: 'none',
          cursor: usable ? 'pointer' : 'not-allowed',
          opacity: disabled ? 0.6 : 1,
          textAlign: 'left',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 auto' }}>
          {selectedLabel}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            color: 'var(--muted-text)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && menuPos && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            zIndex: 1300,
            background: 'var(--dropdown-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.22)',
            padding: '0.25rem',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            ...menuPos,
          }}
        >
          {options.map((o, i) => {
            const isActive = i === activeIndex;
            const isSelected = i === selectedIndex;
            return (
              <div
                key={o.value}
                role="option"
                aria-selected={isSelected}
                data-idx={i}
                onMouseEnter={() => setActiveIndex(i)}
                // Keep keyboard focus on the trigger so key events keep working.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                title={o.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  padding: '0.5rem 0.625rem',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? 'var(--accent)' : 'var(--text-main)',
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
