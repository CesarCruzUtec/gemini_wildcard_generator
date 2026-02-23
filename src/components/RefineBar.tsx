/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Theme } from '../types';

interface Props {
  theme: Theme;
  refiningWildcard: string | null;
  onClear: () => void;
}

export function RefineBar({ theme, refiningWildcard, onClear }: Props) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {refiningWildcard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-6 pb-4 pointer-events-none"
        >
          <div
            className="max-w-2xl w-full rounded-2xl shadow-2xl border-2 pointer-events-auto"
            style={{ backgroundColor: theme.card, borderColor: theme.accent + '60' }}
          >
            <div className="flex items-start gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3 h-3 shrink-0" style={{ color: theme.accent }} />
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">
                    {t('refineBar.instruction')}
                  </span>
                </div>
                <p className="text-sm font-mono leading-relaxed opacity-70 whitespace-pre-wrap break-words line-clamp-3">
                  {refiningWildcard}
                </p>
              </div>
              <button
                onClick={onClear}
                className="shrink-0 p-1.5 rounded-lg transition-colors opacity-40 hover:opacity-100"
                style={{ backgroundColor: theme.input }}
                title="Clear refine selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
