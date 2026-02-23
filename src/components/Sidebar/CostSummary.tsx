/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Theme } from '../../types';

interface Props {
  theme: Theme;
  lastCallCost: number;
  sessionCost: number;
  allTimeCost: number;
}

export function CostSummary({ theme, lastCallCost, sessionCost, allTimeCost }: Props) {
  return (
    <div
      className="px-4 py-3 border-t shrink-0"
      style={{ borderColor: theme.border, backgroundColor: theme.input }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">Last Call</span>
        <span className="text-[10px] font-mono font-medium opacity-60">${lastCallCost.toFixed(6)}</span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">This Session</span>
        <span className="text-[10px] font-mono font-medium opacity-60">${sessionCost.toFixed(6)}</span>
      </div>
      <div
        className="flex items-center justify-between"
        style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '6px', marginTop: '4px' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">All Time</span>
        <span className="text-[10px] font-mono font-bold opacity-80">${allTimeCost.toFixed(6)}</span>
      </div>
    </div>
  );
}
