import { useQuery } from '@apollo/client/react';
import { SearchMusicDocument } from '@/hooks/generated';
import type { SearchMusicQuery, SearchMusicQueryVariables } from '@/hooks/generated';

export function useSearchMusic(query: string) {
  const skip = query.trim().length < 2;

  const { data, loading, error } = useQuery<SearchMusicQuery, SearchMusicQueryVariables>(
    SearchMusicDocument,
    {
      variables: { query },
      skip,
      fetchPolicy: 'cache-and-network',
    },
  );

  return {
    searchResults: data?.searchMusic ?? null,
    loading,
    error: error ?? null,
  };
}
