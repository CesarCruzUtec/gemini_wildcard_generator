/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Save, Sparkles, Image as ImageIcon, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Theme, WildcardItem } from '../types';
import { cn } from '../utils/cn';

interface Props {
  theme: Theme;
  item: WildcardItem;
  /** If the card belongs to the most-recent generation batch, it gets a ring highlight. */
  isHighlighted?: boolean;
  copiedId: string | null;
  galleryEnabled: boolean;
  galleryEmpty: boolean;
  currentGalleryImageUrl: string;
  onCopy: () => void;
  /** Present only on Generated cards */
  onSave?: () => void;
  onRefine: () => void;
  /** Adds currentGalleryImageUrl to the wildcard's preview list. */
  onAddPreview: () => void;
  /** Removes a specific preview URL from the wildcard's preview list. */
  onRemovePreview: (url: string) => void;
  /** Persists the given URL as the default preview_url in the DB. */
  onSetDefaultPreview: (url: string) => void;
  onRemove: () => void;
  onHoverChange: (url: string | null, side?: 'left' | 'right') => void;
  /** Which side of the card to show the preview popup. Default: 'right' */
  previewSide?: 'left' | 'right';
}

export const WildcardCard = React.memo(function WildcardCard({
  theme,
  item,
  isHighlighted = false,
  copiedId,
  galleryEnabled,
  galleryEmpty,
  currentGalleryImageUrl,
  onCopy,
  onSave,
  onRefine,
  onAddPreview,
  onRemovePreview,
  onSetDefaultPreview,
  onRemove,
  onHoverChange,
  previewSide = 'right',
}: Props) {
  const { t } = useTranslation();
  const isCopied = copiedId === item.id;

  // ── Multi-preview cycling ──────────────────────────────────────────────────
  const previewUrls: string[] = item.previewUrls ?? (item.previewUrl ? [item.previewUrl] : []);
  const hasPreview = previewUrls.length > 0;

  // Start at the index that matches the persisted default (preview_url), or 0.
  const defaultIndex = item.previewUrl
    ? Math.max(0, previewUrls.indexOf(item.previewUrl))
    : 0;

  // Current displayed index — kept in refs so wheel handler never goes stale.
  const previewIndexRef = useRef(defaultIndex);
  const [previewIndex, setPreviewIndex] = useState(defaultIndex);

  // Track previous length to detect additions vs. removals.
  const prevLengthRef = useRef(previewUrls.length);

  useEffect(() => {
    const prev = prevLengthRef.current;
    prevLengthRef.current = previewUrls.length;

    if (previewUrls.length === 0) {
      // All previews removed.
      previewIndexRef.current = 0;
      setPreviewIndex(0);
    } else if (previewUrls.length > prev) {
      // A new preview was added — jump to it (always appended at the end).
      const newIdx = previewUrls.length - 1;
      previewIndexRef.current = newIdx;
      setPreviewIndex(newIdx);
      // Also update the big preview overlay immediately.
      onHoverChangeRef.current(previewUrls[newIdx], previewSideRef.current);
    } else if (previewIndexRef.current >= previewUrls.length) {
      // A preview was removed and the index is now out of bounds — clamp.
      const clamped = previewUrls.length - 1;
      previewIndexRef.current = clamped;
      setPreviewIndex(clamped);
    }
  }, [previewUrls.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync to the persisted default whenever item.previewUrl changes externally
  // (e.g. data refresh) without the list length changing.
  useEffect(() => {
    if (!item.previewUrl) return;
    const idx = previewUrls.indexOf(item.previewUrl);
    if (idx !== -1 && idx !== previewIndexRef.current) {
      previewIndexRef.current = idx;
      setPreviewIndex(idx);
    }
  }, [item.previewUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPreviewUrl = previewUrls[previewIndex] ?? null;

  // Refs to latest values so a single stable wheel handler can use them.
  const previewUrlsRef = useRef(previewUrls);
  const onHoverChangeRef = useRef(onHoverChange);
  const onSetDefaultPreviewRef = useRef(onSetDefaultPreview);
  const previewSideRef = useRef(previewSide);
  useEffect(() => { previewUrlsRef.current = previewUrls; });
  useEffect(() => { onHoverChangeRef.current = onHoverChange; });
  useEffect(() => { onSetDefaultPreviewRef.current = onSetDefaultPreview; });
  useEffect(() => { previewSideRef.current = previewSide; });

  // Debounce timer: 1 s after the last scroll, persist the current image as default.
  const defaultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Thumbnail ref — we attach a non-passive wheel listener so we can
  // call preventDefault() and stop the scroll from reaching the wildcard list.
  const thumbnailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = thumbnailRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const urls = previewUrlsRef.current;
      if (urls.length <= 1) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const newIdx = (previewIndexRef.current + dir + urls.length) % urls.length;
      previewIndexRef.current = newIdx;
      setPreviewIndex(newIdx);
      onHoverChangeRef.current(urls[newIdx], previewSideRef.current);
      // Reset the 1-second debounce for persisting the default preview.
      if (defaultTimerRef.current) clearTimeout(defaultTimerRef.current);
      defaultTimerRef.current = setTimeout(() => {
        onSetDefaultPreviewRef.current(previewUrlsRef.current[previewIndexRef.current]);
      }, 1000);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => {
      el.removeEventListener('wheel', handler);
      if (defaultTimerRef.current) clearTimeout(defaultTimerRef.current);
    };
  }, []); // stable — uses refs for latest values

  return (
    <div
      className={cn(
        'group relative border rounded-xl transition-colors overflow-hidden flex flex-row',
        isHighlighted && 'ring-1',
      )}
      style={{
        backgroundColor: theme.card,
        borderColor: isHighlighted ? theme.accent : theme.border,
        '--tw-ring-color': theme.accent,
      } as React.CSSProperties}
      onMouseEnter={() => {
        if (currentPreviewUrl) onHoverChange(currentPreviewUrl, previewSide);
      }}
      onMouseLeave={() => onHoverChange(null)}
    >
      {/* Left: text + buttons */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Text — clicking copies */}
        <div className="p-3 pb-2 flex-1 cursor-pointer" onClick={onCopy}>
          <p className="text-[11px] font-mono opacity-60 leading-relaxed whitespace-pre-wrap break-words">
            {item.text}
          </p>
        </div>

        {/* Action buttons — always visible */}
        <div
          className="flex flex-wrap gap-1 px-3 pb-3 border-t pt-2"
          style={{ borderColor: theme.border }}
          onClick={(e) => e.stopPropagation()}
        >
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-1 px-2 py-1 border rounded-md text-[10px] font-medium transition-colors"
              style={{ backgroundColor: theme.input, borderColor: theme.border }}
            >
              <Save className="w-3 h-3" /> {t('card.save')}
            </button>
          )}
          <button
            onClick={onRefine}
            className="flex items-center gap-1 px-2 py-1 border rounded-md text-[10px] font-medium transition-colors"
            style={{ backgroundColor: theme.input, borderColor: theme.border }}
          >
            <Sparkles className="w-3 h-3" /> {t('card.refine')}
          </button>
          <button
            onClick={onAddPreview}
            disabled={!galleryEnabled || galleryEmpty}
            className="flex items-center gap-1 px-2 py-1 border rounded-md text-[10px] font-medium transition-colors disabled:opacity-20"
            style={{
              backgroundColor: hasPreview ? theme.accent : theme.input,
              borderColor: hasPreview ? theme.accent : theme.border,
              color: hasPreview ? (theme.id === 'dark' ? '#000' : '#fff') : undefined,
            }}
          >
            <ImageIcon className="w-3 h-3" /> {t('card.addPreview')}
          </button>
          <button
            onClick={onRemove}
            className="flex items-center gap-1 px-2 py-1 border rounded-md text-[10px] font-medium transition-colors hover:text-red-500"
            style={{ backgroundColor: theme.input, borderColor: theme.border }}
          >
            <Trash2 className="w-3 h-3" /> {t('card.delete')}
          </button>
        </div>
      </div>

      {/* Right: full-height preview thumbnail — scroll to cycle through previews */}
      {hasPreview && (
        <div
          ref={thumbnailRef}
          className="relative shrink-0 w-20 border-l select-none"
          style={{ borderColor: theme.border }}
          title={previewUrls.length > 1 ? `${previewIndex + 1} / ${previewUrls.length} — scroll to cycle` : undefined}
        >
          <img
            src={currentPreviewUrl!}
            className="absolute inset-0 w-full h-full object-cover"
            alt="preview"
            draggable={false}
          />

          {/* Multiple-preview indicator */}
          {previewUrls.length > 1 && (
            <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-0.5 pointer-events-none">
              {previewUrls.map((_, i) => (
                <span
                  key={i}
                  className="block rounded-full transition-all"
                  style={{
                    width: i === previewIndex ? 6 : 4,
                    height: 4,
                    backgroundColor: i === previewIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Remove current preview button */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemovePreview(currentPreviewUrl!); }}
            className="absolute top-1 right-1 p-0.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove this preview"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Copied overlay */}
      <AnimatePresence>
        {isCopied && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-20"
            style={{ backgroundColor: `${theme.card}e6` }}
          >
            <div className="flex items-center gap-2 text-emerald-600">
              <Check className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Copied</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
