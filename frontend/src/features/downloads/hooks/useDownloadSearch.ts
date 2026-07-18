import { useCallback, useEffect, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import {
  DownloadSearchDocument,
  StartDownloadSearchDocument,
} from '@/hooks/generated';
import type {
  DownloadSearchQuery,
  DownloadSearchQueryVariables,
  StartDownloadSearchQuery,
  StartDownloadSearchQueryVariables,
} from '@/hooks/generated';

const SEARCH_POLL_MS = 1000;

export function useDownloadSearch() {
  const [searchId, setSearchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [startSearch, startState] = useLazyQuery<
    StartDownloadSearchQuery,
    StartDownloadSearchQueryVariables
  >(StartDownloadSearchDocument, {
    fetchPolicy: 'network-only',
  });

  const {
    data,
    error: pollError,
    stopPolling,
  } = useQuery<DownloadSearchQuery, DownloadSearchQueryVariables>(
    DownloadSearchDocument,
    {
      variables: { id: searchId ?? '' },
      skip: !searchId,
      pollInterval: SEARCH_POLL_MS,
      fetchPolicy: 'network-only',
    },
  );

  const searchResult = data?.downloadSearch ?? null;
  const isComplete = searchResult?.isComplete ?? false;

  useEffect(() => {
    if (isComplete) {
      stopPolling();
    }
  }, [isComplete, stopPolling]);

  useEffect(() => {
    if (!searchId || !pollError) return;
    setError(pollError.message);
  }, [pollError, searchId]);

  const search = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      setError(null);
      setSearchId(null);

      try {
        const result = await startSearch({ variables: { query: trimmed } });
        if (result.error) {
          setError(result.error.message);
          return;
        }
        const id = result.data?.startDownloadSearch.id;
        if (id) {
          setSearchId(id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      }
    },
    [startSearch],
  );

  const reset = useCallback(() => {
    setSearchId(null);
    setError(null);
  }, []);

  const starting = startState.loading;
  const searching = starting || (!!searchId && !isComplete);

  return {
    search,
    reset,
    searchId,
    searchResult,
    searching,
    isComplete,
    error,
  };
}
