/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Theme, WildcardItem } from '../types';
import { WildcardListHandle } from '../hooks/useWildcardList';
import { WildcardList } from './WildcardList';
import { ColumnPreviewOverlay } from './ColumnPreviewOverlay';

interface Props {
  theme: Theme;
  // Generated list
  generatedList: WildcardListHandle;
  clearGeneratedConfirm: boolean;
  setClearGeneratedConfirm: (v: boolean) => void;
  onClearGenerated: () => void;
  onSave: (item: WildcardItem) => void;
  onRemoveGenerated: (id: string) => void;
  // Saved list
  savedList: WildcardListHandle;
  clearSavedConfirm: boolean;
  setClearSavedConfirm: (v: boolean) => void;
  onClearSaved: () => void;
  onRemoveSaved: (id: string) => void;
  // Shared
  copiedId: string | null;
  lastGenerationTime: number;
  galleryEnabled: boolean;
  galleryEmpty: boolean;
  currentGalleryImageUrl: string;
  onCopy: (text: string, id: string) => void;
  onRefine: (text: string) => void;
  onAddPreview: (id: string, url: string, listType: 'generated' | 'saved') => void;
  onRemovePreview: (id: string, url: string, listType: 'generated' | 'saved') => void;
  onSetDefaultPreview: (id: string, url: string, listType: 'generated' | 'saved') => void;
}

/**
 * Owns the hover-preview state so that mouse-enter/leave events only
 * re-render this subtree — not the entire App component tree.
 */
export const WildcardsColumns = React.memo(function WildcardsColumns({
  theme,
  generatedList,
  clearGeneratedConfirm,
  setClearGeneratedConfirm,
  onClearGenerated,
  onSave,
  onRemoveGenerated,
  savedList,
  clearSavedConfirm,
  setClearSavedConfirm,
  onClearSaved,
  onRemoveSaved,
  copiedId,
  lastGenerationTime,
  galleryEnabled,
  galleryEmpty,
  currentGalleryImageUrl,
  onCopy,
  onRefine,
  onAddPreview,
  onRemovePreview,
  onSetDefaultPreview,
}: Props) {
  // ── Hover preview state lives here — changes don't bubble up to App ──────
  const [previewHover, setPreviewHover] = useState<{ url: string; side: 'left' | 'right' } | null>(null);
  const { t } = useTranslation();

  const handleHoverChange = useCallback((url: string | null, side: 'left' | 'right' = 'right') => {
    setPreviewHover(url ? { url, side } : null);
  }, []);

  // Stable callbacks so WildcardList can be memoized effectively.
  const handleAddPreviewGenerated = useCallback(
    (id: string, url: string) => onAddPreview(id, url, 'generated'),
    [onAddPreview],
  );
  const handleAddPreviewSaved = useCallback(
    (id: string, url: string) => onAddPreview(id, url, 'saved'),
    [onAddPreview],
  );
  const handleRemovePreviewGenerated = useCallback(
    (id: string, url: string) => onRemovePreview(id, url, 'generated'),
    [onRemovePreview],
  );
  const handleRemovePreviewSaved = useCallback(
    (id: string, url: string) => onRemovePreview(id, url, 'saved'),
    [onRemovePreview],
  );
  const handleSetDefaultPreviewGenerated = useCallback(
    (id: string, url: string) => onSetDefaultPreview(id, url, 'generated'),
    [onSetDefaultPreview],
  );
  const handleSetDefaultPreviewSaved = useCallback(
    (id: string, url: string) => onSetDefaultPreview(id, url, 'saved'),
    [onSetDefaultPreview],
  );
  const showClearGenerated = useCallback(() => setClearGeneratedConfirm(true), [setClearGeneratedConfirm]);
  const cancelClearGenerated = useCallback(() => setClearGeneratedConfirm(false), [setClearGeneratedConfirm]);
  const showClearSaved = useCallback(() => setClearSavedConfirm(true), [setClearSavedConfirm]);
  const cancelClearSaved = useCallback(() => setClearSavedConfirm(false), [setClearSavedConfirm]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Generated column */}
      <div
        className="relative flex-1 border-r overflow-hidden flex flex-col"
        style={{ borderColor: theme.border }}
      >
        {/* Overlay shown when a Saved card is hovered */}
        <ColumnPreviewOverlay url={previewHover?.side === 'left' ? previewHover.url : null} />
        <WildcardList
          theme={theme}
          title={t('list.generated')}
          items={generatedList.items}
          total={generatedList.total}
          isLoadingMore={generatedList.isLoadingMore}
          hasMore={generatedList.hasMore}
          onLoadMore={generatedList.loadMore}
          isInitialLoad={generatedList.isInitialLoad}
          clearConfirm={clearGeneratedConfirm}
          onShowClearConfirm={showClearGenerated}
          onCancelClear={cancelClearGenerated}
          onClear={onClearGenerated}
          copiedId={copiedId}
          lastGenerationTime={lastGenerationTime}
          galleryEnabled={galleryEnabled}
          galleryEmpty={galleryEmpty}
          currentGalleryImageUrl={currentGalleryImageUrl}
          onCopy={onCopy}
          onSave={onSave}
          onRefine={onRefine}
          onAddPreview={handleAddPreviewGenerated}
          onRemovePreview={handleRemovePreviewGenerated}
          onSetDefaultPreview={handleSetDefaultPreviewGenerated}
          onRemove={onRemoveGenerated}
          onHoverChange={handleHoverChange}
          previewSide="right"
        />
      </div>

      {/* Saved column */}
      <div className="relative flex-1 overflow-hidden flex flex-col">
        {/* Overlay shown when a Generated card is hovered */}
        <ColumnPreviewOverlay url={previewHover?.side === 'right' ? previewHover.url : null} />
        <WildcardList
          theme={theme}
          title={t('list.saved')}
          items={savedList.items}
          total={savedList.total}
          isLoadingMore={savedList.isLoadingMore}
          hasMore={savedList.hasMore}
          onLoadMore={savedList.loadMore}
          isInitialLoad={savedList.isInitialLoad}
          clearConfirm={clearSavedConfirm}
          onShowClearConfirm={showClearSaved}
          onCancelClear={cancelClearSaved}
          onClear={onClearSaved}
          copiedId={copiedId}
          galleryEnabled={galleryEnabled}
          galleryEmpty={galleryEmpty}
          currentGalleryImageUrl={currentGalleryImageUrl}
          onCopy={onCopy}
          onRefine={onRefine}
          onAddPreview={handleAddPreviewSaved}
          onRemovePreview={handleRemovePreviewSaved}
          onSetDefaultPreview={handleSetDefaultPreviewSaved}
          onRemove={onRemoveSaved}
          onHoverChange={handleHoverChange}
          previewSide="left"
        />
      </div>
    </div>
  );
});
