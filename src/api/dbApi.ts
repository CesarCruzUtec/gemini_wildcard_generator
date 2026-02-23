/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WildcardItem } from '../types';

/** REST helpers – fire-and-forget for optimistic updates */
export const dbApi = {
  // ── Wildcards ──────────────────────────────────────────────────────────────
  fetchList: async (list: 'generated' | 'saved'): Promise<WildcardItem[]> => {
    const res = await fetch(`/api/wildcards?list=${list}`);
    return res.json();
  },

  add: (items: (WildcardItem & { list: string })[]) =>
    fetch('/api/wildcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }),

  patch: (id: string, patch: { list?: string; previewUrl?: string | null }) =>
    fetch(`/api/wildcards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),

  remove: (id: string) => fetch(`/api/wildcards/${id}`, { method: 'DELETE' }),

  clearList: (list: 'generated' | 'saved') =>
    fetch(`/api/wildcards?list=${list}`, { method: 'DELETE' }),

  reorder: (list: 'generated' | 'saved', ids: string[]) =>
    fetch('/api/wildcards/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list, ids }),
    }),

  // ── Costs ──────────────────────────────────────────────────────────────────
  fetchCosts: async (): Promise<{ total: number }> => {
    const res = await fetch('/api/costs');
    return res.json();
  },

  createSession: async (label: string): Promise<string> => {
    const res = await fetch('/api/costs/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    const data = await res.json();
    return data.id as string;
  },

  updateSession: (id: string, amount: number) =>
    fetch(`/api/costs/session/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }),

  addToTotal: (delta: number) =>
    fetch('/api/costs/total', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    }),

  // ── Config ──────────────────────────────────────────────────────────────────
  fetchConfig: async (): Promise<{ galleryDir: string; apiKey: string }> => {
    const res = await fetch('/api/config');
    return res.json();
  },

  updateConfig: (config: { galleryDir?: string; apiKey?: string }) =>
    fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }),

  resetDb: () => fetch('/api/db/reset', { method: 'POST' }),
};
