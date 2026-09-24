'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';

interface ImageUploaderProps {
  label: string;
  value?: string;
  folder?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  accept?: string;
  helperText?: string;
  error?: string;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  previewClassName?: string;
}

export default function ImageUploader({
  label,
  value,
  folder = 'uploads',
  maxWidth,
  maxHeight,
  quality = 80,
  accept = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml',
  helperText,
  error,
  onUpload,
  onRemove,
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [imageBroken, setImageBroken] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(value || null);
    setImageBroken(false);
  }, [value]);

  const handleFile = useCallback(async (file: File) => {
    if (disabled || uploading) return;

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      if (maxWidth) formData.append('maxWidth', String(maxWidth));
      if (maxHeight) formData.append('maxHeight', String(maxHeight));
      formData.append('quality', String(quality));

      const res = await api.upload<{ success: boolean; data: { url: string; key: string } }>(
        '/api/upload/image',
        formData,
      );

      if (res.success && res.data?.url) {
        setPreview(res.data.url);
        setImageBroken(false);
        onUpload(res.data.url);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError(err.message);
      } else {
        setUploadError('Upload failed');
      }
    } finally {
      setUploading(false);
    }
  }, [disabled, uploading, folder, maxWidth, maxHeight, quality, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [handleFile]);

  // Removal only clears the form — the object is deleted from R2 by the page
  // (on Save if the change is persisted, on page exit if it was abandoned).
  const handleRemove = useCallback(() => {
    setPreview(null);
    setImageBroken(false);
    if (onRemove) onRemove();
  }, [onRemove]);

  const displayError = error || uploadError;

  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'var(--label-text)',
        marginBottom: '0.375rem',
      }}>
        {label}
      </label>

      {preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            width: '200px',
            height: '120px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: `1px solid ${dragOver ? 'var(--accent)' : 'var(--input-border)'}`,
            backgroundColor: dragOver ? 'var(--accent-light)' : 'var(--input-bg)',
            // Checkerboard backdrop so transparent images (white/dark logos,
            // SVGs) stay visible against any theme.
            backgroundImage: dragOver
              ? undefined
              : 'repeating-conic-gradient(var(--input-border) 0% 25%, transparent 0% 50%)',
            backgroundSize: '14px 14px',
            transition: 'border-color 0.15s',
          }}
        >
          {imageBroken ? (
            <div style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              padding: '0.5rem',
              textAlign: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
              <span style={{ fontSize: '0.6875rem', color: 'var(--muted-text)' }}>
                Preview unavailable
              </span>
            </div>
          ) : (
            <img
              src={preview}
              alt={label}
              onError={() => setImageBroken(true)}
              style={{
                flex: 1,
                width: '100%',
                minHeight: 0,
                objectFit: 'contain',
                padding: '8px',
                boxSizing: 'border-box',
              }}
            />
          )}

          {uploading && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg style={{ animation: 'spin 0.7s linear infinite' }} width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="3" fill="none" opacity="0.35" />
                <path fill="#ffffff" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.9" />
              </svg>
            </div>
          )}

          {!disabled && (
            <div style={{
              display: 'flex',
              flexShrink: 0,
              borderTop: '1px solid var(--input-border)',
              backgroundColor: 'var(--card-bg)',
            }}>
              <button
                type="button"
                className="imgup-btn"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                title="Replace image"
                style={{ borderRight: '1px solid var(--input-border)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Change
              </button>
              <button
                type="button"
                className="imgup-btn imgup-btn-remove"
                onClick={handleRemove}
                disabled={uploading}
                title="Remove image"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && inputRef.current?.click()}
          style={{
            width: '200px',
            height: '120px',
            borderRadius: '8px',
            border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--input-border)'}`,
            backgroundColor: dragOver ? 'var(--accent-light)' : 'var(--input-bg)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {uploading ? (
            <svg style={{ animation: 'spin 0.7s linear infinite' }} width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="3" fill="none" opacity="0.25" />
              <path fill="var(--accent)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>
            {uploading ? 'Uploading...' : 'Drop or click'}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {helperText && !displayError && (
        <p style={{ fontSize: '0.75rem', color: 'var(--muted-text)', marginTop: '0.375rem' }}>
          {helperText}
        </p>
      )}
      {displayError && (
        <p style={{ fontSize: '0.75rem', color: 'var(--error-text, #ef4444)', marginTop: '0.375rem' }}>
          {displayError}
        </p>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .imgup-btn {
          flex: 1;
          min-width: 0;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 0 0.25rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.6875rem;
          font-weight: 500;
          color: var(--text-muted);
          transition: background-color 0.15s;
        }
        .imgup-btn:hover:not(:disabled) { background-color: var(--hover-bg, rgba(127,127,127,0.12)); }
        .imgup-btn:disabled { cursor: not-allowed; opacity: 0.6; }
        .imgup-btn-remove { color: var(--error-text, #ef4444); }
      `}</style>
    </div>
  );
}
