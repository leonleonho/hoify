import { useState, useCallback, useEffect, useRef } from 'react';
import { searchDiscogs } from '../discogs/client';
import type { DiscogsResult } from '../discogs/types';

interface DiscogsSearchState {
  results: DiscogsResult[];
  loading: boolean;
  error: string | null;
  searched: boolean;
}

export function useDiscogsSearch(query: string) {
  const [state, setState] = useState<DiscogsSearchState>({
    results: [],
    loading: false,
    error: null,
    searched: false,
  });
  const lastQuery = useRef('');

  // Reset discogs results when search query changes
  useEffect(() => {
    if (query !== lastQuery.current) {
      lastQuery.current = query;
      setState({ results: [], loading: false, error: null, searched: false });
    }
  }, [query]);

  const search = useCallback(async () => {
    if (query.trim().length < 2) return;

    setState((prev) => ({ ...prev, loading: true, error: null, searched: true }));

    try {
      const results = await searchDiscogs(query);
      setState({ results, loading: false, error: null, searched: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Discogs search failed';
      setState({ results: [], loading: false, error: message, searched: true });
    }
  }, [query]);

  return { ...state, search };
}
