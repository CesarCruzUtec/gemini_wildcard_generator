/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../types';

interface Props {
  theme: Theme;
  show: boolean;
  generatedCount: number;
  savedCount: number;
  allTimeCost: number;
  onClose: () => void;
  onReset: () => void;
}

export function ResetDbModal({ theme, show, generatedCount, savedCount, allTimeCost, onClose, onReset }: Props) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: theme.card, color: theme.text }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: theme.border }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 shrink-0">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold">{t('resetModal.title')}</h2>
                <p className="text-[10px] opacity-40 mt-0.5">{t('resetModal.subtitle')}</p>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs opacity-60 leading-relaxed">{t('resetModal.description')}</p>
              <ul className="space-y-2">
                {[
                  { label: t('resetModal.generatedWildcards'), value: generatedCount },
                  { label: t('resetModal.savedWildcards'), value: savedCount },
                  { label: t('resetModal.allTimeCost'), value: `$${allTimeCost.toFixed(6)}` },
                  { label: t('resetModal.apiKeyGallery'), value: t('resetModal.cleared') },
                ].map(({ label, value }) => (
                  <li
                    key={label}
                    className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
                    style={{ backgroundColor: theme.input }}
                  >
                    <span className="opacity-60">{label}</span>
                    <span className="font-bold font-mono opacity-80">{value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                style={{ backgroundColor: theme.input }}
              >
                {t('resetModal.cancel')}
              </button>
              <button
                onClick={onReset}
                className="flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all bg-red-500 hover:bg-red-600 text-white"
              >
                {t('resetModal.resetEverything')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
