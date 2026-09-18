'use client';

import { useState, useRef, useCallback } from 'react';

interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  helperText?: string;
  error?: string;
  onChange?: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

export function FileUpload({
  label,
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024,
  helperText,
  error,
  onChange,
  className = '',
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const arr = Array.from(newFiles).filter((f) => f.size <= maxSize);
      const updated = multiple ? [...files, ...arr] : arr.slice(0, 1);
      setFiles(updated);
      onChange?.(updated);
    },
    [files, multiple, maxSize, onChange],
  );

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onChange?.(updated);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-800'
            : isDragging
            ? 'border-accent-500 bg-accent-500/5'
            : error
            ? 'border-red-400 dark:border-red-500 hover:border-red-500'
            : 'border-gray-300 dark:border-gray-700 hover:border-accent-400 hover:bg-accent-500/5'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          className="sr-only"
        />
        <div className={`mb-2 flex justify-center ${isDragging ? 'text-accent-500' : 'text-gray-400 dark:text-gray-500'}`}>
          <UploadIcon />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-accent-500">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Max size: {formatSize(maxSize)}
          {accept && ` • ${accept}`}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-gray-400"><FileIcon /></span>
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
              <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                <XIcon />
              </button>
            </div>
          ))}
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
