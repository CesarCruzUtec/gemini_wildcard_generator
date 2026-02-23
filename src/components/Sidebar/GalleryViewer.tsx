/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { Theme } from '../../types';
import { cn } from '../../utils/cn';

interface Props {
  theme: Theme;
  galleryEnabled: boolean;
  galleryLoading: boolean;
  galleryFiles: string[];
  galleryIndex: number;
  setGalleryIndex: (i: number | ((prev: number) => number)) => void;
  onRefresh: () => Promise<void>;
  onOpenSettings: () => void;
}

export function GalleryViewer({
  theme,
  galleryEnabled,
  galleryLoading,
  galleryFiles,
  galleryIndex,
  setGalleryIndex,
  onRefresh,
  onOpenSettings,
}: Props) {
  return (
    <div
      className="flex-1 flex flex-col p-4 gap-3 overflow-hidden border-t"
      style={{ borderColor: theme.border }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between shrink-0">
        <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Output Gallery</label>
        <div className="flex items-center gap-2">
          {galleryFiles.length > 0 && (
            <span className="text-[10px] font-mono opacity-30">
              {galleryIndex + 1} / {galleryFiles.length}
            </span>
          )}
          <button
            onClick={onRefresh}
            className="p-1 rounded-md hover:opacity-100 opacity-40 transition-opacity"
            title="Refresh gallery"
          >
            <RefreshCw className={cn('w-3 h-3', galleryLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!galleryEnabled ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-4 opacity-30">
          <FolderOpen className="w-6 h-6" />
          <span className="text-[10px] uppercase tracking-wider">No gallery folder set</span>
          <button onClick={onOpenSettings} className="text-[10px] underline underline-offset-2 mt-1">
            Configure in Settings
          </button>
        </div>
      ) : galleryLoading ? (
        <div className="flex-1 flex items-center justify-center opacity-20">
          <RefreshCw className="w-5 h-5 animate-spin" />
        </div>
      ) : galleryFiles.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-20">
          <ImageIcon className="w-6 h-6" />
          <span className="text-[10px] uppercase tracking-wider">No images found</span>
        </div>
      ) : (
        <>
          <div
            className="flex-1 rounded-xl overflow-hidden relative"
            style={{ backgroundColor: theme.input }}
          >
            <img
              key={galleryFiles[galleryIndex]}
              src={`/gallery-images/${galleryFiles[galleryIndex]}`}
              className="w-full h-full object-contain"
              alt={galleryFiles[galleryIndex]}
            />
          </div>
          <p className="text-[9px] font-mono opacity-30 truncate shrink-0 text-center">
            {galleryFiles[galleryIndex]}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setGalleryIndex((i) => Math.max(0, i - 1))}
              disabled={galleryIndex === 0}
              className="flex-1 h-7 rounded-lg text-xs font-medium disabled:opacity-20 transition-opacity"
              style={{ backgroundColor: theme.input, color: theme.text }}
            >
              ← Prev
            </button>
            <button
              onClick={() => setGalleryIndex((i) => Math.min(galleryFiles.length - 1, i + 1))}
              disabled={galleryIndex === galleryFiles.length - 1}
              className="flex-1 h-7 rounded-lg text-xs font-medium disabled:opacity-20 transition-opacity"
              style={{ backgroundColor: theme.input, color: theme.text }}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
