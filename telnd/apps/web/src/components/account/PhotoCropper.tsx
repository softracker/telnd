'use client';

// Crop step (§14.66) — a photo that isn't already square gets one turn in
// front of this dialog before the avatar endpoint sees it. react-easy-crop
// with a ROUND selection: the circle the member drags the photo into IS
// the frame the avatar becomes, so the circle doubles as the preview they
// approve (no separate thumbnail to reason about). Confirm renders the
// selection through a canvas at the selection's own resolution (capped at
// 1024²) and hands the blob up — the server's 512² WebP conversion then
// runs on exactly what was approved. An already-square file never meets
// this dialog; it goes straight through.

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { AuthError, Spinner } from '@/components/auth/AuthUI';
import { primaryBtn, quietBtn } from '@/components/account/ui';

/** Decode an object URL and report its oriented intrinsic size. */
export function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('image failed to decode'));
    img.src = src;
  });
}

const MAX_CROP_PX = 1024;

/** Draw the chosen region into a square canvas and encode it (WebP where
 *  the browser offers it — an older engine silently falls back to PNG,
 *  which the server accepts and converts anyway). */
function renderCrop(src: string, area: Area): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const size = Math.min(MAX_CROP_PX, Math.round(area.width));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
        canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.92);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('image failed to decode'));
    img.src = src;
  });
}

interface PhotoCropperProps {
  /** Object URL of the picked file — revoked by the caller on close. */
  src: string;
  /** An upload started from Confirm — the dialog can't be dismissed mid-flight. */
  busy: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
}

export default function PhotoCropper({ src, busy, onCancel, onConfirm }: PhotoCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [setting, setSetting] = useState(false);
  // Set only when THIS dialog fails to render its own crop — the server's
  // answers to the upload ride the toast instead (§14.67) and arrive above
  // the dialog, while the crop stays put for the retry.
  const [cropError, setCropError] = useState('');
  const areaRef = useRef<Area | null>(null);

  const close = useCallback(() => {
    if (!busy) onCancel();
  }, [busy, onCancel]);

  // Escape dismisses the dialog — except while the approved photo is in
  // flight, when an answer is already on its way.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const confirm = useCallback(async () => {
    const area = areaRef.current;
    if (!area || busy || setting) return;
    if (area.width < 1 || area.height < 1) return;
    setSetting(true);
    setCropError('');
    try {
      const blob = await renderCrop(src, area);
      if (blob) {
        await onConfirm(blob);
      } else {
        setCropError('That photo could not be processed. Please try another photo.');
      }
    } catch {
      // The caller's onConfirm never ran — the dialog stays open with its
      // own message so the crop survives the retry instead of a re-pick.
      setCropError('That photo could not be processed. Please try another photo.');
    } finally {
      setSetting(false);
    }
  }, [busy, onConfirm, setting, src]);

  const inFlight = busy || setting;

  return (
    // z-[1100]: My Account's chrome (header, rail, toggles, drawer) lives
    // at 998–1001 in account.css — a sheet-level z-50 would scrim only the
    // content pane and paint UNDER the top bar and sidebar. The dialog
    // sits above all of it, edge to edge.
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      {/* Scrim — click to dismiss, never mid-upload */}
      <button
        type="button"
        aria-label="Close"
        title="Close"
        onClick={close}
        disabled={busy}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Adjust your photo"
        className="relative w-[min(92vw,26rem)] rounded-[28px] bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)] dark:bg-[#1C1C1E]"
      >
        <h2 className="text-[18px] font-semibold text-[#1F2937] dark:text-[#F1F5F9]">Adjust your photo</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[#64748B] dark:text-white/50">
          Drag the photo inside the circle and zoom if you like — the circle is exactly what your
          profile will show.
        </p>

        <div className="relative mt-4 h-64 overflow-hidden rounded-[10px] bg-[#0D0D0D]">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            maxZoom={3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => {
              areaRef.current = pixels;
            }}
          />
        </div>

        <label className="mt-3 flex items-center gap-3">
          <span className="text-[13px] font-medium text-gray-700 dark:text-white/80">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom the photo"
            className="h-1 flex-1 accent-[#30A9A2]"
          />
        </label>

        {cropError && (
          <div className="mt-3">
            <AuthError>{cropError}</AuthError>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className={quietBtn}
            onClick={close}
            disabled={inFlight}
            title="Discard the crop"
          >
            Cancel
          </button>
          <button
            type="button"
            className={primaryBtn}
            onClick={() => void confirm()}
            disabled={inFlight}
            title="Crop and set this photo"
          >
            {inFlight && <Spinner className="h-4 w-4" />}
            {busy ? 'Uploading…' : setting ? 'Setting…' : 'Set photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
