import { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Input } from '@/components/input/Input';
import { colors, spacing, typography } from '@/constants/theme';
import { useSearchMusic } from '@/features/search/hooks/useSearchMusic';
import { useDiscogsSearch } from '@/features/search/hooks/useDiscogsSearch';
import { SearchResults } from '@/features/search/components/SearchResults';

const DEBOUNCE_MS = 300;

export default function IndexScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = useCallback((text: string) => {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebouncedQuery(text), DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const { searchResults, loading, error } = useSearchMusic(debouncedQuery);
  const {
    results: discogsResults,
    loading: discogsLoading,
    error: discogsError,
    searched: discogsSearched,
    search: discogsSearch,
  } = useDiscogsSearch(debouncedQuery);
  const hasActiveSearch = debouncedQuery.trim().length >= 2;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Input
          placeholder="Search for songs, artists, albums…"
          value={query}
          onChangeText={handleChangeText}
          returnKeyType="search"
        />
      </View>

      {hasActiveSearch ? (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {searchResults ? (
            <SearchResults
              data={searchResults}
              loading={false}
              error={null}
              onExtendedSearch={discogsSearch}
              discogsResults={discogsResults}
              discogsLoading={discogsLoading}
              discogsError={discogsError}
              discogsSearched={discogsSearched}
            />
          ) : (
            loading && (
              <View style={styles.centered}>
                <Text style={styles.promptText}>Searching…</Text>
              </View>
            )
          )}
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.promptText}>
            Search for songs, artists, albums…
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  promptText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
