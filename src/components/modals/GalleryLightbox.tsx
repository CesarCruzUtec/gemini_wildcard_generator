/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
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

// direction: 1 = going forward (next), -1 = going back (prev)
const variants = {
  enter: (dir: number) => ({
    x: dir * 420,
    rotate: dir * 12,
    opacity: 0,
    scale: 0.85,
  }),
  center: {
    x: 0,
    rotate: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir: number) => ({
    x: dir * -520,
    rotate: dir * -14,
    opacity: 0,
    scale: 0.8,
  }),
};

export function GalleryLightbox({ theme, files, index, onClose, onNavigate }: Props) {
  const hasPrev = index > 0;
  const hasNext = index < files.length - 1;
  const dirRef = useRef(1);
  const [displayIndex, setDisplayIndex] = useState(index);

  const navigate = useCallback((nextIndex: number) => {
    dirRef.current = nextIndex > displayIndex ? 1 : -1;
    setDisplayIndex(nextIndex);
    onNavigate(nextIndex);
  }, [displayIndex, onNavigate]);

  const prev = useCallback(() => { if (hasPrev) navigate(index - 1); }, [hasPrev, index, navigate]);
  const next = useCallback(() => { if (hasNext) navigate(index + 1); }, [hasNext, index, navigate]);

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
          {displayIndex + 1} / {files.length}
        </div>

        {/* Prev button */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Swipe card */}
        <div className="relative flex items-center justify-center" style={{ width: '90vw', height: '85vh' }}>
          <AnimatePresence custom={dirRef.current} mode="popLayout">
            <motion.img
              key={displayIndex}
              custom={dirRef.current}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.8 }}
              src={`/gallery-images/${files[displayIndex]}`}
              alt={files[displayIndex]}
              className="absolute max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              style={{ originY: 1 }}
              onClick={(e) => e.stopPropagation()}
            />
          </AnimatePresence>
        </div>

        {/* Next button */}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Filename */}
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-mono truncate max-w-[80vw] text-center">
          {files[displayIndex]}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
