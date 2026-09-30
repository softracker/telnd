'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';

export interface OtpInputHandle {
  /** Put the caret in the next box that still needs a digit. */
  focus: () => void;
}

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /**
   * Fired with the full code the moment the last box is filled (type, paste
   * or autofill) — lets the caller submit instead of waiting for a click.
   */
  onComplete?: (value: string) => void;
  /** Accessible name of the whole row; also prefixes each box. */
  ariaLabel: string;
  /** Links an external <label> to the first box. */
  firstInputId?: string;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  /**
   * 'password' dots each box — the security PIN rows use it so a long-lived
   * secret never sits in clear the way an ephemeral 6-digit code may.
   */
  type?: 'text' | 'password';
  /** Autocomplete token for the first box; the PIN rows pass 'off'. */
  autoComplete?: string;
  /** Extra styles for the row itself (alignment, margins…). */
  containerStyle?: CSSProperties;
  /** Resting look of one box. */
  style?: CSSProperties;
  /** Merged over `style` while a box holds focus. */
  focusStyle?: CSSProperties;
}

/**
 * The resting look of the code boxes, shared by the 2FA rows on the
 * Security tab and the security PIN rows so the two stay in step.
 */
export const otpBoxStyle: CSSProperties = {
  height: '40px',
  fontSize: '0.9375rem',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'var(--input-border)',
  backgroundColor: 'var(--input-bg)',
  color: 'var(--text-main)',
};

/** The focused-box accent that goes with {@link otpBoxStyle}. */
export const otpFocusStyle: CSSProperties = { borderColor: 'var(--accent)' };

/**
 * The six separate boxes the 6-digit code is typed into — on the login
 * challenge and in the Security page enrolment panels alike. Digits land one
 * box at a time and the caret jumps ahead, Backspace clears and steps back,
 * arrows/Home/End roam the row, and a paste or an OS/SMS autofill fills the
 * whole row at once. The parent keeps a single digit string; this component
 * only decides how it is edited and drawn, so each call site themes it with
 * its own box styles and the two screens stay visually in sync.
 */
export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  {
    value,
    onChange,
    onComplete,
    ariaLabel,
    firstInputId,
    length = 6,
    disabled = false,
    autoFocus = false,
    type = 'text',
    autoComplete = 'one-time-code',
    containerStyle,
    style,
    focusStyle,
  },
  ref,
) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const [focused, setFocused] = useState(-1);

  // The value is a dense string (no holes), so edits that arrive before the
  // parent re-renders must still see the newest digits — keep a ref in sync
  // and update it optimistically the moment we emit a change.
  const valueRef = useRef(value);
  valueRef.current = value;

  function focusBox(index: number): void {
    boxes.current[Math.max(0, Math.min(index, length - 1))]?.focus();
  }

  useImperativeHandle(ref, () => ({
    focus() {
      focusBox(valueRef.current.length);
    },
  }));

  function emit(next: string): void {
    const prev = valueRef.current;
    valueRef.current = next;
    onChange(next);
    // Only on the fill transition (5→6), never while replacing digits in an
    // already-full row — so one completed code means exactly one submit.
    if (next.length === length && prev.length < length) {
      onComplete?.(next);
    }
  }

  function handleFocus(index: number): void {
    setFocused(index);
    // Clicking (or tabbing) past the filled part jumps to the first empty
    // box, so a digit typed there still shows up right where it was typed.
    if (!valueRef.current[index] && index > valueRef.current.length) {
      focusBox(valueRef.current.length);
    }
  }

  function handleChange(index: number, raw: string): void {
    const digits = raw.replace(/\D/g, '');
    const at = Math.min(index, valueRef.current.length);
    if (!digits) {
      emit(valueRef.current.slice(0, at) + valueRef.current.slice(at + 1));
      return;
    }
    const current = valueRef.current;
    emit((current.slice(0, at) + digits + current.slice(at + digits.length)).slice(0, length));
    focusBox(at + digits.length);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>): void {
    const current = valueRef.current;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (current[index]) {
        emit(current.slice(0, index) + current.slice(index + 1));
      } else if (index > 0) {
        emit(current.slice(0, index - 1) + current.slice(index));
        focusBox(index - 1);
      }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (current[index]) emit(current.slice(0, index) + current.slice(index + 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(index + 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusBox(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusBox(length - 1);
    }
  }

  function handlePaste(index: number, e: ClipboardEvent<HTMLInputElement>): void {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!digits) return;
    const current = valueRef.current;
    const at = Math.min(index, current.length);
    emit((current.slice(0, at) + digits + current.slice(at + digits.length)).slice(0, length));
    focusBox(at + digits.length);
  }

  return (
    <div role="group" aria-label={ariaLabel} style={{ display: 'flex', gap: '0.5rem', ...containerStyle }}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            boxes.current[index] = el;
          }}
          id={index === 0 ? firstInputId : undefined}
          type={type}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete={index === 0 ? autoComplete : 'off'}
          aria-label={`${ariaLabel} ${index + 1}/${length}`}
          value={value[index] ?? ''}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={() => handleFocus(index)}
          onBlur={() => setFocused(-1)}
          style={{
            width: '100%',
            maxWidth: '48px',
            flex: '1 1 0',
            minWidth: '0',
            height: '44px',
            textAlign: 'center',
            fontSize: '1.125rem',
            fontWeight: 600,
            borderRadius: '8px',
            // Longhands only: a `border` shorthand here fights the
            // focusStyle's `borderColor` on blur and React warns about
            // removing a non-shorthand while the shorthand is set.
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#d1d5db',
            padding: 0,
            outline: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            ...style,
            ...(focused === index ? focusStyle : undefined),
          }}
        />
      ))}
    </div>
  );
});
