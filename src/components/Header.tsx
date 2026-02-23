/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Settings2, HelpCircle, KeyRound, FolderOpen } from 'lucide-react';
import { Theme } from '../types';
import { THEMES } from '../constants';

interface Props {
  theme: Theme;
  themeId: string;
  setThemeId: (id: string) => void;
  apiKey: string;
  galleryEnabled: boolean;
  showSettings: boolean;
  onToggleSettings: () => void;
  onShowGuide: () => void;
}

export function Header({
  theme,
  themeId,
  setThemeId,
  apiKey,
  galleryEnabled,
  showSettings,
  onToggleSettings,
  onShowGuide,
}: Props) {
  return (
    <header
      className="h-14 border-b flex items-center justify-between px-6 shrink-0 transition-colors duration-300"
      style={{ backgroundColor: theme.sidebar, borderColor: theme.border }}
    >
      {/* Left: logo + warning badges */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4" style={{ color: theme.accent }} />
        <h1 className="text-sm font-medium tracking-tight">Wildcard Studio</h1>

        {!apiKey.trim() && (
          <button
            onClick={onToggleSettings}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-opacity hover:opacity-80"
            style={{
              borderColor: 'rgba(250,100,100,0.5)',
              color: 'rgb(220,80,80)',
              backgroundColor: 'rgba(250,100,100,0.08)',
            }}
          >
            <KeyRound className="w-2.5 h-2.5" /> No API Key
          </button>
        )}

        {!galleryEnabled && (
          <button
            onClick={onToggleSettings}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-opacity hover:opacity-80"
            style={{
              borderColor: 'rgba(200,160,0,0.5)',
              color: 'rgb(180,140,0)',
              backgroundColor: 'rgba(230,190,0,0.08)',
            }}
          >
            <FolderOpen className="w-2.5 h-2.5" /> No Gallery
          </button>
        )}
      </div>

      {/* Right: theme picker + guide + settings */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Theme</label>
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="bg-transparent text-[10px] font-bold uppercase tracking-wider border-none focus:ring-0 cursor-pointer"
            style={{ color: theme.accent }}
          >
            {THEMES.map((t) => (
              <option
                key={t.id}
                value={t.id}
                style={{ backgroundColor: theme.card, color: theme.text }}
              >
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onShowGuide}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors hover:bg-black/5 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: theme.muted }}
        >
          <HelpCircle className="w-4 h-4" /> Guide
        </button>

        <button
          onClick={onToggleSettings}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors text-[10px] font-bold uppercase tracking-wider"
          style={{
            backgroundColor: showSettings ? theme.input : 'transparent',
            color: showSettings ? theme.accent : theme.muted,
          }}
        >
          <Settings2 className="w-4 h-4" /> Settings
        </button>
      </div>
    </header>
  );
}
