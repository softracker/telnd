'use client';

import { useState, useRef, useCallback } from 'react';

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  showValue?: boolean;
  showMarks?: boolean;
  marks?: { value: number; label: string }[];
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  label,
  showValue = true,
  showMarks = false,
  marks,
  disabled = false,
  size = 'md',
  className = '',
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = ((value - min) / (max - min)) * 100;

  const calculateValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return value;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + pct * (max - min);
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step, value],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    onChange(calculateValue(e.clientX));

    const handleMouseMove = (e: MouseEvent) => {
      onChange(calculateValue(e.clientX));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const sizes = {
    sm: { track: 'h-1', thumb: 'w-3.5 h-3.5' },
    md: { track: 'h-1.5', thumb: 'w-4 h-4' },
    lg: { track: 'h-2', thumb: 'w-5 h-5' },
  };

  const s = sizes[size];
  const displayMarks = marks || (showMarks
    ? [
        { value: min, label: String(min) },
        { value: (max - min) / 2 + min, label: String(Math.round((max - min) / 2 + min)) },
        { value: max, label: String(max) },
      ]
    : []);

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
          {showValue && (
            <span className="text-sm font-semibold text-accent-500 tabular-nums">{value}</span>
          )}
        </div>
      )}

      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        className={`relative ${s.track} rounded-full cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div
          className={`absolute h-full rounded-full bg-accent-500 transition-[width] ${isDragging ? '' : 'duration-100'}`}
          style={{ width: `${percentage}%` }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 ${s.thumb} rounded-full bg-white border-2 border-accent-500 shadow-md transition-transform ${
            isDragging ? 'scale-110' : ''
          }`}
          style={{ left: `${percentage}%` }}
        />
      </div>

      {displayMarks.length > 0 && (
        <div className="relative mt-2">
          {displayMarks.map((mark) => {
            const pct = ((mark.value - min) / (max - min)) * 100;
            return (
              <div
                key={mark.value}
                className="absolute text-xs text-gray-400 dark:text-gray-500 -translate-x-1/2"
                style={{ left: `${pct}%` }}
              >
                {mark.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
