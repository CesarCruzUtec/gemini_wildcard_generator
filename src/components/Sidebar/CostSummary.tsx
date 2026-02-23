/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../types';

interface Props {
  theme: Theme;
  lastCallCost: number;
  sessionCost: number;
  allTimeCost: number;
}

export function CostSummary({ theme, lastCallCost, sessionCost, allTimeCost }: Props) {
  const { t } = useTranslation();
  return (
    <div
      className="px-4 py-3 border-t shrink-0"
      style={{ borderColor: theme.border, backgroundColor: theme.input }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">{t('costs.lastCall')}</span>
        <span className="text-[10px] font-mono font-medium opacity-60">${lastCallCost.toFixed(6)}</span>
      </div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">{t('costs.thisSession')}</span>
        <span className="text-[10px] font-mono font-medium opacity-60">${sessionCost.toFixed(6)}</span>
      </div>
      <div
        className="flex items-center justify-between"
        style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '6px', marginTop: '4px' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">{t('costs.allTime')}</span>
        <span className="text-[10px] font-mono font-bold opacity-80">${allTimeCost.toFixed(6)}</span>
      </div>
    </div>
  );
}
