import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { DownloadsDocument } from '@/hooks/generated';
import type { DownloadsQuery, DownloadsQueryVariables } from '@/hooks/generated';

const DOWNLOAD_POLL_MS = 2000;
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function useDownloads() {
  const { data, loading, error, startPolling, stopPolling, refetch } = useQuery<
    DownloadsQuery,
    DownloadsQueryVariables
  >(DownloadsDocument, {
    pollInterval: DOWNLOAD_POLL_MS,
    fetchPolicy: 'cache-and-network',
  });

  const downloads = data?.downloads ?? [];
  const hasActive = downloads.some((d) => !isTerminalStatus(d.status));

  useEffect(() => {
    if (hasActive) {
      startPolling(DOWNLOAD_POLL_MS);
    } else {
      stopPolling();
    }
  }, [hasActive, startPolling, stopPolling]);

  return {
    downloads,
    loading,
    error: error ?? null,
    hasActive,
    refetch,
  };
}
