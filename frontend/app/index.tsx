import { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '@/components/input/Input';
import { colors, spacing, typography } from '@/constants/theme';
import { useSearchMusic } from '@/features/search/hooks/useSearchMusic';
import { SearchResults } from '@/features/search/components/SearchResults';
import { CategoryTile } from '@/components/home/CategoryTile';
import { PlaylistRow } from '@/components/playlist/PlaylistRow';

const DEBOUNCE_MS = 300;

export default function IndexScreen() {
  const router = useRouter();
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

  const { searchResults, loading } = useSearchMusic(debouncedQuery);
  const hasActiveSearch = debouncedQuery.trim().length >= 2;

  const handleFindMusic = useCallback(() => {
    const q = debouncedQuery.trim();
    const path = q
      ? `/find?q=${encodeURIComponent(q)}`
      : '/find';
    router.push(path as any);
  }, [debouncedQuery, router]);

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

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {hasActiveSearch ? (
          <>
            {searchResults ? (
              <SearchResults
                data={searchResults}
                loading={false}
                error={null}
                onFindMusic={handleFindMusic}
              />
            ) : (
              loading && (
                <View style={styles.centered}>
                  <Text style={styles.promptText}>Searching…</Text>
                </View>
              )
            )}
          </>
        ) : (
          <View>
            <PlaylistRow
              onPlaylistPress={(id) => router.push(`/playlist/${id}` as any)}
            />
            <View style={styles.categories}>
              <CategoryTile
                category="artists"
                onPress={() => router.push('/artists' as any)}
              />
              <CategoryTile
                category="albums"
                onPress={() => router.push('/albums' as any)}
              />
            </View>
            <View style={styles.findRow}>
              <CategoryTile
                category="find"
                onPress={() => router.push('/find' as any)}
              />
            </View>
          </View>
        )}
      </ScrollView>
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
  categories: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  findRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
