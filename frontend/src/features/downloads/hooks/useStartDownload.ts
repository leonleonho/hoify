import { useCallback, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { DownloadsDocument, StartDownloadDocument } from '@/hooks/generated';
import type {
  StartDownloadMutation,
  StartDownloadMutationVariables,
} from '@/hooks/generated';
import type { DownloadFileInput } from '@/hooks/generated/types';

export function useStartDownload() {
  const client = useApolloClient();
  const [error, setError] = useState<Error | null>(null);
  const [mutate, { loading }] = useMutation<
    StartDownloadMutation,
    StartDownloadMutationVariables
  >(StartDownloadDocument, {
    refetchQueries: [{ query: DownloadsDocument }],
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const startDownload = useCallback(
    async (peer: string, files: DownloadFileInput[]) => {
      if (files.length === 0) return null;
      setError(null);
      try {
        return await mutate({ variables: { peer, files } });
      } catch (err) {
        // Partial enqueue may still have persisted rows before the error.
        await client.refetchQueries({ include: [DownloadsDocument] });
        const next =
          err instanceof Error ? err : new Error('Failed to add');
        setError(next);
        return null;
      }
    },
    [client, mutate],
  );

  return {
    startDownload,
    loading,
    error,
    clearError,
  };
}
