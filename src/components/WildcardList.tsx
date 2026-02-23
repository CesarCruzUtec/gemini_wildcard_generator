/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Theme, WildcardItem } from '../types';
import { WildcardCard } from './WildcardCard';

interface Props {
  theme: Theme;
  title: string;
  /** Paginated items currently in memory. */
  items?: WildcardItem[];
  /** DB total (matching search) — shown in the header count. */
  total: number;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  /** True during the very first page load — shows a full-column spinner. */
  isInitialLoad: boolean;
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
  onRemovePreview: (id: string) => void;
  onRemove: (id: string) => void;
  onHoverChange: (url: string | null, x?: number, y?: number, side?: 'left' | 'right') => void;
  previewSide?: 'left' | 'right';
}

export function WildcardList({
  theme,
  title,
  items,
  total,
  isLoadingMore,
  hasMore,
  onLoadMore,
  isInitialLoad,
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
  onRemovePreview,
  onRemove,
  onHoverChange,
  previewSide = 'right',
}: Props) {
  const safeItems = items ?? [];
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual item count includes a sentinel loader row when there are more pages.
  const count = hasMore ? safeItems.length + 1 : safeItems.length;

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 8,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Trigger loadMore when approaching the end of the loaded items.
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (last.index >= safeItems.length - 5) {
      onLoadMore();
    }
  }, [virtualItems, hasMore, isLoadingMore, safeItems.length, onLoadMore]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Section header */}
      <div className="border-b shrink-0" style={{ borderColor: theme.border }}>
        <div className="p-4 flex items-center justify-between gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider opacity-40">
            {title} ({total})
          </h2>

          <div className="flex items-center gap-1">
            <button
              onClick={onShowClearConfirm}
              disabled={total === 0}
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
                    {total} wildcard{total !== 1 ? 's' : ''}
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

      {/* Cards — virtualised */}
      {isInitialLoad && isLoadingMore ? (
        <div className="flex-1 flex items-center justify-center opacity-30">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : (
        <div ref={parentRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualItems.map((vRow) => {
              const isLoaderRow = vRow.index >= safeItems.length;
              return (
                <div
                  key={vRow.key}
                  data-index={vRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vRow.start}px)`,
                  }}
                >
                  {isLoaderRow ? (
                    <div className="flex items-center justify-center py-6 opacity-30">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </div>
                  ) : (
                    <div style={{ padding: '0 1rem 1rem' }}>
                      <WildcardCard
                        theme={theme}
                        item={safeItems[vRow.index]}
                        isHighlighted={
                          lastGenerationTime !== undefined &&
                          safeItems[vRow.index].createdAt === lastGenerationTime
                        }
                        copiedId={copiedId}
                        galleryEnabled={galleryEnabled}
                        galleryEmpty={galleryEmpty}
                        currentGalleryImageUrl={currentGalleryImageUrl}
                        onCopy={() => onCopy(safeItems[vRow.index].text, safeItems[vRow.index].id)}
                        onSave={onSave ? () => onSave(safeItems[vRow.index]) : undefined}
                        onRefine={() => onRefine(safeItems[vRow.index].text)}
                        onSetPreview={() => onSetPreview(safeItems[vRow.index].id, currentGalleryImageUrl)}
                        onRemovePreview={() => onRemovePreview(safeItems[vRow.index].id)}
                        onRemove={() => onRemove(safeItems[vRow.index].id)}
                        onHoverChange={onHoverChange}
                        previewSide={previewSide}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
