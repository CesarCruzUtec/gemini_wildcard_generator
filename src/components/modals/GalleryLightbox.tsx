/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Theme } from '../../types';

interface Props {
  theme: Theme;
  files: string[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function GalleryLightbox({ theme, files, index, onClose, onNavigate }: Props) {
  const hasPrev = index > 0;
  const hasNext = index < files.length - 1;

  const prev = useCallback(() => { if (hasPrev) onNavigate(index - 1); }, [hasPrev, index, onNavigate]);
  const next = useCallback(() => { if (hasNext) onNavigate(index + 1); }, [hasNext, index, onNavigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) next();
      else prev();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
    };
  }, [onClose, prev, next]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.88)' }}
        onClick={onClose}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Counter */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-xs font-mono">
          {index + 1} / {files.length}
        </div>

        {/* Prev button */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Image */}
        <motion.img
          key={files[index]}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          src={`/gallery-images/${files[index]}`}
          alt={files[index]}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Next button */}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Filename */}
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-mono truncate max-w-[80vw] text-center">
          {files[index]}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
