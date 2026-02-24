/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WildcardItem } from '../types';

export interface FetchListResult {
  items: WildcardItem[];
  total: number;
  nextCursor: number | null;
}

export interface FetchListOpts {
  limit?: number;
  cursor?: number | null;
  q?: string;
}

/** REST helpers – fire-and-forget for optimistic updates */
export const dbApi = {
  // ── Wildcards ──────────────────────────────────────────────────────────────
  fetchList: async (
    list: 'generated' | 'saved',
    opts: FetchListOpts = {},
  ): Promise<FetchListResult> => {
    const params = new URLSearchParams({ list });
    if (opts.limit !== undefined) params.set('limit', String(opts.limit));
    if (opts.cursor !== null && opts.cursor !== undefined) params.set('cursor', String(opts.cursor));
    if (opts.q) params.set('q', opts.q);
    const res = await fetch(`/api/wildcards?${params}`);
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

  // ── Wildcard previews ──────────────────────────────────────────────────────
  addPreview: (wildcardId: string, url: string) =>
    fetch(`/api/wildcards/${wildcardId}/previews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }),

  removePreview: (wildcardId: string, url: string) =>
    fetch(`/api/wildcards/${wildcardId}/previews`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
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
