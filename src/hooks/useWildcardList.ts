/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WildcardItem } from '../types';
import { dbApi } from '../api/dbApi';

const PAGE_SIZE = 50;

export interface WildcardListHandle {
  items: WildcardItem[];
  /** Total count of items matching the current search in the DB. */
  total: number;
  isLoadingMore: boolean;
  /** True during the very first fetch (shows full-panel spinner). */
  isInitialLoad: boolean;
  hasMore: boolean;
  loadMore: () => void;
  /** Optimistically add new items at the top of the list. */
  prepend: (newItems: WildcardItem[]) => void;
  update: (id: string, patch: Partial<WildcardItem>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/**
 * Manages a single paginated wildcard list.
 * Uses cursor-based pagination on the `position` column so newly generated
 * items (prepended locally at lower positions) never cause duplicate rows on
 * subsequent "load more" fetches.
 */
export function useWildcardList(
  list: 'generated' | 'saved',
  searchQuery: string,
): WildcardListHandle {
  const [items, setItems] = useState<WildcardItem[]>([]);
  // Items fetched from DB (not counting local prepends) — used to derive hasMore.
  const [dbFetched, setDbFetched] = useState(0);
  // Total rows in DB for the current search.
  const [serverTotal, setServerTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refs for async-safe coordination.
  const nextCursorRef = useRef<number | null>(null); // position cursor for next page
  const isFetchingRef = useRef(false);               // prevents concurrent fetches
  const activeQueryRef = useRef(searchQuery);        // detects stale responses

  const fetchPage = useCallback(
    async (q: string, cursor: number | null, replace: boolean) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoadingMore(true);
      try {
        const result = await dbApi.fetchList(list, { limit: PAGE_SIZE, cursor, q });
        // Discard if the search query changed while we were waiting.
        if (activeQueryRef.current !== q) return;
        nextCursorRef.current = result.nextCursor;
        setServerTotal(result.total);
        if (replace) {
          setItems(result.items);
          setDbFetched(result.items.length);
          setIsInitialLoad(false);
        } else {
          setItems((prev) => [...prev, ...result.items]);
          setDbFetched((prev) => prev + result.items.length);
        }
      } catch {
        setIsInitialLoad(false);
      } finally {
        isFetchingRef.current = false;
        setIsLoadingMore(false);
      }
    },
    [list],
  );

  // Re-fetch from scratch whenever the search query changes.
  useEffect(() => {
    activeQueryRef.current = searchQuery;
    nextCursorRef.current = null;
    setIsInitialLoad(true);
    setItems([]);
    setDbFetched(0);
    setServerTotal(0);
    fetchPage(searchQuery, null, true);
  }, [searchQuery, list, fetchPage]);

  const hasMore = dbFetched < serverTotal;

  const loadMore = useCallback(() => {
    if (!isFetchingRef.current && hasMore) {
      fetchPage(activeQueryRef.current, nextCursorRef.current, false);
    }
  }, [hasMore, fetchPage]);

  /**
   * Optimistically prepend items generated locally.
   * We don't shift nextCursorRef because new DB rows get positions below all
   * existing ones — cursor-based `position > X` will correctly skip them on
   * future loadMore calls.
   * Both dbFetched and serverTotal are incremented so `hasMore` stays stable
   * and the virtualizer does not immediately trigger an unwanted loadMore.
   */
  const prepend = useCallback((newItems: WildcardItem[]) => {
    setItems((prev) => [...newItems, ...prev]);
    setServerTotal((prev) => prev + newItems.length);
    setDbFetched((prev) => prev + newItems.length);
  }, []);

  const update = useCallback((id: string, patch: Partial<WildcardItem>) => {
    setItems((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((w) => w.id !== id));
    setServerTotal((prev) => Math.max(0, prev - 1));
    setDbFetched((prev) => Math.max(0, prev - 1));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setServerTotal(0);
    setDbFetched(0);
    nextCursorRef.current = null;
  }, []);

  return {
    items,
    total: serverTotal,
    isLoadingMore,
    isInitialLoad,
    hasMore,
    loadMore,
    prepend,
    update,
    remove,
    clear,
  };
}
