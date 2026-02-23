/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Save, Sparkles, Image as ImageIcon, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  onSetPreview: () => void;
  onRemovePreview: () => void;
  onRemove: () => void;
  onHoverChange: (url: string | null, x?: number, y?: number, side?: 'left' | 'right') => void;
  /** Which side of the card to show the preview popup. Default: 'right' */
  previewSide?: 'left' | 'right';
}

export function WildcardCard({
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
  onSetPreview,
  onRemovePreview,
  onRemove,
  onHoverChange,
  previewSide = 'right',
}: Props) {
  const isCopied = copiedId === item.id;
  const hasPreview = Boolean(item.previewUrl);

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
      onMouseEnter={(e) => {
        if (item.previewUrl) {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const anchorX = previewSide === 'right' ? rect.right : rect.left;
          onHoverChange(item.previewUrl, anchorX, rect.top, previewSide);
        }
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
              <Save className="w-3 h-3" /> Save
            </button>
          )}
          <button
            onClick={onRefine}
            className="flex items-center gap-1 px-2 py-1 border rounded-md text-[10px] font-medium transition-colors"
            style={{ backgroundColor: theme.input, borderColor: theme.border }}
          >
            <Sparkles className="w-3 h-3" /> Refine
          </button>
          <button
            onClick={onSetPreview}
            disabled={!galleryEnabled || galleryEmpty}
            className="flex items-center gap-1 px-2 py-1 border rounded-md text-[10px] font-medium transition-colors disabled:opacity-20"
            style={{
              backgroundColor: hasPreview ? theme.accent : theme.input,
              borderColor: hasPreview ? theme.accent : theme.border,
              color: hasPreview ? (theme.id === 'dark' ? '#000' : '#fff') : undefined,
            }}
          >
            <ImageIcon className="w-3 h-3" /> Preview
          </button>
          <button
            onClick={onRemove}
            className="flex items-center gap-1 px-2 py-1 border rounded-md text-[10px] font-medium transition-colors hover:text-red-500"
            style={{ backgroundColor: theme.input, borderColor: theme.border }}
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>

      {/* Right: full-height preview thumbnail */}
      {hasPreview && (
        <div
          className="relative shrink-0 w-20 border-l"
          style={{ borderColor: theme.border }}
        >
          <img
            src={item.previewUrl}
            className="absolute inset-0 w-full h-full object-cover"
            alt="preview"
          />
          {/* Remove preview button */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemovePreview(); }}
            className="absolute top-1 right-1 p-0.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove preview"
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
}
