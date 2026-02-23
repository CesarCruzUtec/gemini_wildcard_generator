/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { KeyRound, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Theme } from '../types';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../constants';

interface Props {
  theme: Theme;
  show: boolean;
  systemInstruction: string;
  setSystemInstruction: (v: string) => void;
  apiKeyInput: string;
  setApiKeyInput: (v: string) => void;
  galleryPathInput: string;
  setGalleryPathInput: (v: string) => void;
  onApplyApiKey: (trimmed: string) => Promise<void>;
  onApplyGallery: (trimmed: string) => Promise<void>;
  onClose: () => void;
  onShowResetConfirm: () => void;
}

export function SettingsOverlay({
  theme,
  show,
  systemInstruction,
  setSystemInstruction,
  apiKeyInput,
  setApiKeyInput,
  galleryPathInput,
  setGalleryPathInput,
  onApplyApiKey,
  onApplyGallery,
  onClose,
  onShowResetConfirm,
}: Props) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-14 left-0 right-0 z-50 border-b p-6 shadow-xl"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left column: System Instructions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">
                  {t('settings.systemInstructions')}
                </label>
                <button
                  onClick={() => setSystemInstruction(DEFAULT_SYSTEM_INSTRUCTION)}
                  className="text-[10px] font-bold opacity-40 hover:opacity-100 transition-colors"
                >
                  {t('settings.resetToDefault')}
                </button>
              </div>
              <textarea
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                className="w-full h-48 border-none rounded-xl p-4 text-xs font-mono focus:ring-1 transition-all resize-none"
                style={{
                  backgroundColor: theme.input,
                  color: theme.text,
                  '--tw-ring-color': theme.accent,
                } as React.CSSProperties}
              />
            </div>

            {/* Right column: API Key, Gallery Path, actions */}
            <div className="space-y-4">
              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">{t('settings.apiKeyLabel')}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-30" />
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={t('settings.apiKeyPlaceholder')}
                      className="w-full h-10 border-none rounded-lg pl-8 pr-4 text-xs focus:ring-1 transition-all"
                      style={{
                        backgroundColor: theme.input,
                        color: theme.text,
                        '--tw-ring-color': theme.accent,
                      } as React.CSSProperties}
                    />
                  </div>
                  <button
                    onClick={() => onApplyApiKey(apiKeyInput.trim())}
                    className="h-10 px-4 rounded-lg text-xs font-bold transition-all shrink-0"
                    style={{ backgroundColor: theme.input, color: theme.accent }}
                  >
                    {t('settings.apply')}
                  </button>
                </div>
              </div>

              {/* Gallery Path */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">{t('settings.galleryFolderLabel')}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-30" />
                    <input
                      type="text"
                      value={galleryPathInput}
                      onChange={(e) => setGalleryPathInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      placeholder={t('settings.galleryPlaceholder')}
                      className="w-full h-10 border-none rounded-lg pl-8 pr-4 text-xs focus:ring-1 transition-all"
                      style={{
                        backgroundColor: theme.input,
                        color: theme.text,
                        '--tw-ring-color': theme.accent,
                      } as React.CSSProperties}
                    />
                  </div>
                  <button
                    onClick={() => onApplyGallery(galleryPathInput.trim())}
                    className="h-10 px-4 rounded-lg text-xs font-bold transition-all shrink-0"
                    style={{ backgroundColor: theme.input, color: theme.accent }}
                  >
                    {t('settings.apply')}
                  </button>
                </div>
                <p className="text-[9px] opacity-30 leading-relaxed">
                  {t('settings.galleryNote')}
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t flex flex-col gap-2" style={{ borderColor: theme.border }}>
                <button
                  onClick={onClose}
                  className="w-full h-10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                  style={{ backgroundColor: theme.accent, color: theme.id === 'dark' ? '#000' : '#fff' }}
                >
                  {t('settings.closeSettings')}
                </button>
                <button
                  onClick={onShowResetConfirm}
                  className="w-full h-9 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-red-500/30 text-red-500/60 hover:text-red-500 hover:border-red-500/60 hover:bg-red-500/5"
                >
                  {t('settings.resetDatabase')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
