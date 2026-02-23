/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Theme } from '../../types';
import { InputPanel } from './InputPanel';
import { GalleryViewer } from './GalleryViewer';
import { CostSummary } from './CostSummary';

interface Props {
  theme: Theme;
  // InputPanel
  userPrompt: string;
  setUserPrompt: (v: string) => void;
  referenceImages: string[];
  setReferenceImages: (updater: (prev: string[]) => string[]) => void;
  numToGenerate: number;
  setNumToGenerate: (v: number) => void;
  isLoading: boolean;
  onGenerate: () => void;
  onSurprise: () => void;
  // GalleryViewer
  galleryEnabled: boolean;
  galleryLoading: boolean;
  galleryFiles: string[];
  galleryIndex: number;
  setGalleryIndex: (i: number | ((prev: number) => number)) => void;
  onGalleryRefresh: () => Promise<void>;
  onOpenSettings: () => void;
  // CostSummary
  lastCallCost: number;
  sessionCost: number;
  allTimeCost: number;
}

export function Sidebar(props: Props) {
  const { theme } = props;

  return (
    <aside
      className="w-[26rem] border-r flex flex-col shrink-0 transition-colors duration-300"
      style={{ backgroundColor: theme.sidebar, borderColor: theme.border }}
    >
      <InputPanel
        theme={theme}
        userPrompt={props.userPrompt}
        setUserPrompt={props.setUserPrompt}
        referenceImages={props.referenceImages}
        setReferenceImages={props.setReferenceImages}
        numToGenerate={props.numToGenerate}
        setNumToGenerate={props.setNumToGenerate}
        isLoading={props.isLoading}
        onGenerate={props.onGenerate}
        onSurprise={props.onSurprise}
      />

      <GalleryViewer
        theme={theme}
        galleryEnabled={props.galleryEnabled}
        galleryLoading={props.galleryLoading}
        galleryFiles={props.galleryFiles}
        galleryIndex={props.galleryIndex}
        setGalleryIndex={props.setGalleryIndex}
        onRefresh={props.onGalleryRefresh}
        onOpenSettings={props.onOpenSettings}
      />

      <CostSummary
        theme={theme}
        lastCallCost={props.lastCallCost}
        sessionCost={props.sessionCost}
        allTimeCost={props.allTimeCost}
      />
    </aside>
  );
}
