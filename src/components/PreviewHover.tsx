/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Theme } from '../types';

interface PreviewHoverState {
  url: string;
  x: number;
  y: number;
}

interface Props {
  theme: Theme;
  previewHover: PreviewHoverState | null;
}

const PREVIEW_SIZE = 210;
const PREVIEW_OFFSET = 10;
const SCREEN_PADDING = 8;

export function PreviewHover({ theme, previewHover }: Props) {
  if (!previewHover) return null;

  const left = Math.min(previewHover.x + PREVIEW_OFFSET, window.innerWidth - PREVIEW_SIZE);
  const top = Math.max(SCREEN_PADDING, Math.min(previewHover.y, window.innerHeight - PREVIEW_SIZE));

  return (
    <div
      className="fixed z-[200] pointer-events-none rounded-xl overflow-hidden shadow-2xl border"
      style={{
        left,
        top,
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        backgroundColor: theme.card,
        borderColor: theme.border,
      }}
    >
      <img
        src={previewHover.url}
        className="w-full h-full object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        alt="wildcard preview"
      />
    </div>
  );
}
