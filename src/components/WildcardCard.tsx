/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Save, Sparkles, Image as ImageIcon, Trash2, Check } from 'lucide-react';
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
  onRemove,
  onHoverChange,
  previewSide = 'right',
}: Props) {
  const isCopied = copiedId === item.id;
  const hasPreview = Boolean(item.previewUrl);

  return (
    <div
      className={cn(
        'group relative border rounded-xl transition-colors overflow-hidden',
        isHighlighted && 'ring-1',
      )}
      style={{
        backgroundColor: theme.card,
        borderColor: isHighlighted ? theme.accent : theme.border,
        '--tw-ring-color': theme.accent,
      } as React.CSSProperties}
      onClick={onCopy}
      onMouseEnter={(e) => {
        if (item.previewUrl) {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const anchorX = previewSide === 'right' ? rect.right : rect.left;
          onHoverChange(item.previewUrl, anchorX, rect.top, previewSide);
        }
      }}
      onMouseLeave={() => onHoverChange(null)}
    >
      {/* Linked preview thumbnail */}
      {hasPreview && (
        <div
          className="absolute top-2 right-2 w-8 h-8 rounded-md overflow-hidden border z-10 opacity-70 pointer-events-none"
          style={{ borderColor: theme.border }}
        >
          <img src={item.previewUrl} className="w-full h-full object-cover" alt="preview" />
        </div>
      )}

      {/* Text */}
      <div className="p-4">
        <p className="text-[11px] font-mono opacity-60 leading-relaxed whitespace-pre-wrap break-words">
          {item.text}
        </p>
      </div>

      {/* Action buttons (visible on hover) */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {onSave && (
          <button
            onClick={(e) => { e.stopPropagation(); onSave(); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Save className="w-3 h-3" /> Save
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onRefine(); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <Sparkles className="w-3 h-3" /> Refine
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onSetPreview(); }}
          disabled={!galleryEnabled || galleryEmpty}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium disabled:opacity-20"
          style={{
            backgroundColor: hasPreview ? theme.accent : theme.card,
            borderColor: hasPreview ? theme.accent : theme.border,
            color: hasPreview ? (theme.id === 'dark' ? '#000' : '#fff') : undefined,
          }}
        >
          <ImageIcon className="w-3 h-3" /> Preview
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium hover:text-red-500"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>

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
