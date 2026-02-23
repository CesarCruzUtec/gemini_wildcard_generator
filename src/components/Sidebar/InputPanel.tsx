/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { RefreshCw, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../types';
import { cn } from '../../utils/cn';

interface Props {
  theme: Theme;
  userPrompt: string;
  setUserPrompt: (v: string) => void;
  referenceImages: string[];
  setReferenceImages: (updater: (prev: string[]) => string[]) => void;
  numToGenerate: number;
  setNumToGenerate: (v: number) => void;
  isLoading: boolean;
  onGenerate: () => void;
  onSurprise: () => void;
}

export function InputPanel({
  theme,
  userPrompt,
  setUserPrompt,
  referenceImages,
  setReferenceImages,
  numToGenerate,
  setNumToGenerate,
  isLoading,
  onGenerate,
  onSurprise,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - referenceImages.length);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        // Lazy import to keep this component lean
        const { resizeImage } = await import('../../utils/imageUtils');
        const resized = await resizeImage(base64);
        setReferenceImages((prev) => [...prev, resized]);
      };
      reader.readAsDataURL(file);
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const canGenerate = !isLoading && (userPrompt.trim().length > 0 || referenceImages.length > 0);

  return (
    <div className="p-6 space-y-4 border-b overflow-y-auto custom-scrollbar" style={{ borderColor: theme.border }}>
      {/* Prompt */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">{t('input.requestLabel')}</label>
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder={t('input.requestPlaceholder')}
          className="w-full h-24 border-none rounded-lg p-3 text-sm focus:ring-1 transition-all resize-none placeholder:opacity-20"
          style={{
            backgroundColor: theme.input,
            color: theme.text,
            '--tw-ring-color': theme.accent,
          } as React.CSSProperties}
        />
      </div>

      {/* Reference Images */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">
            {t('input.referenceImages', { count: referenceImages.length })}
          </label>
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={referenceImages.length >= 4}
            className="p-1 hover:bg-black/5 rounded-md transition-colors disabled:opacity-10"
          >
            <Plus className="w-3 h-3" />
          </button>
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageUpload}
            className="hidden"
            accept="image/*"
            multiple
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {referenceImages.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-black/5">
              <img src={img} className="w-full h-full object-cover" alt={`ref-${idx}`} />
              <button
                onClick={() => setReferenceImages((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-md"
              >
                <X className="w-2 h-2" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">{t('input.countLabel')}</label>
        <input
          type="number"
          min="1"
          max="100"
          value={numToGenerate}
          onChange={(e) => setNumToGenerate(parseInt(e.target.value) || 1)}
          className="w-full h-9 border-none rounded-lg px-3 text-xs focus:ring-1 transition-all"
          style={{
            backgroundColor: theme.input,
            color: theme.text,
            '--tw-ring-color': theme.accent,
          } as React.CSSProperties}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="flex-1 h-10 text-xs font-medium rounded-lg disabled:opacity-20 transition-all flex items-center justify-center gap-2"
          style={{ backgroundColor: theme.accent, color: theme.id === 'dark' ? '#000' : '#fff' }}
        >
          {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : t('input.generate')}
        </button>
        <button
          onClick={onSurprise}
          disabled={isLoading}
          className="w-10 h-10 rounded-lg transition-all flex items-center justify-center"
          title={t('input.surpriseMe')}
          style={{ backgroundColor: theme.input, color: theme.muted }}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
}
