/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Reorder } from 'motion/react';
import { motion, AnimatePresence } from 'motion/react';
import { Theme, WildcardItem } from '../types';
import { WildcardCard } from './WildcardCard';

interface Props {
  theme: Theme;
  title: string;
  /** Filtered (search-matched) subset of the full list. */
  items: WildcardItem[];
  /** Unfiltered list (needed for merge-reorder). */
  fullList: WildcardItem[];
  onReorder: (merged: WildcardItem[]) => void;
  clearConfirm: boolean;
  onShowClearConfirm: () => void;
  onCancelClear: () => void;
  onClear: () => void;
  // Card props
  copiedId: string | null;
  lastGenerationTime?: number;
  galleryEnabled: boolean;
  galleryEmpty: boolean;
  currentGalleryImageUrl: string;
  onCopy: (text: string, id: string) => void;
  /** Only for the Generated list */
  onSave?: (item: WildcardItem) => void;
  onRefine: (text: string) => void;
  onSetPreview: (id: string, url: string) => void;
  onRemove: (id: string) => void;
  onHoverChange: (url: string | null, x?: number, y?: number, side?: 'left' | 'right') => void;
  previewSide?: 'left' | 'right';
}

/** Merges a reordered filtered subset back into the full list, preserving non-filtered items' positions. */
function mergeReorder<T extends { id: string }>(fullList: T[], filteredReordered: T[]): T[] {
  const filteredIds = new Set(filteredReordered.map((item) => item.id));
  const filteredIndexes = fullList.reduce<number[]>((acc, item, idx) => {
    if (filteredIds.has(item.id)) acc.push(idx);
    return acc;
  }, []);
  const result = [...fullList];
  filteredIndexes.forEach((pos, i) => { result[pos] = filteredReordered[i]; });
  return result;
}

export function WildcardList({
  theme,
  title,
  items,
  fullList,
  onReorder,
  clearConfirm,
  onShowClearConfirm,
  onCancelClear,
  onClear,
  copiedId,
  lastGenerationTime,
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Section header */}
      <div className="border-b shrink-0" style={{ borderColor: theme.border }}>
        <div className="p-4 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider opacity-40">
            {title} ({items.length})
          </h2>

          <div className="flex items-center gap-1">
            <button
              onClick={onShowClearConfirm}
              disabled={fullList.length === 0}
              className="flex items-center gap-1.5 px-2 py-1 hover:bg-black/5 rounded-md transition-colors opacity-40 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed text-[10px] font-medium"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
        </div>

        {/* Clear confirmation bar */}
        <AnimatePresence>
          {clearConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className="px-4 pb-3 flex items-center justify-between gap-3 border-t pt-3"
                style={{ borderColor: theme.border }}
              >
                <p className="text-[10px] opacity-60 leading-tight">
                  Delete{' '}
                  <span className="font-bold text-red-500">
                    {fullList.length} wildcard{fullList.length !== 1 ? 's' : ''}
                  </span>{' '}
                  permanently?
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={onCancelClear}
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors"
                    style={{ backgroundColor: theme.input }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onClear}
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    Delete all
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={(reordered) => onReorder(mergeReorder(fullList, reordered))}
          className="flex flex-col gap-4"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <WildcardCard
                key={item.id}
                theme={theme}
                item={item}
                isHighlighted={lastGenerationTime !== undefined && item.createdAt === lastGenerationTime}
                copiedId={copiedId}
                galleryEnabled={galleryEnabled}
                galleryEmpty={galleryEmpty}
                currentGalleryImageUrl={currentGalleryImageUrl}
                onCopy={() => onCopy(item.text, item.id)}
                onSave={onSave ? () => onSave(item) : undefined}
                onRefine={() => onRefine(item.text)}
                onSetPreview={() => onSetPreview(item.id, currentGalleryImageUrl)}
                onRemove={() => onRemove(item.id)}
                onHoverChange={onHoverChange}
                previewSide={previewSide}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </div>
  );
}
