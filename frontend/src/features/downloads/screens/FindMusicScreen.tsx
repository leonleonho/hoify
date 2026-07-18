import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Input } from '@/components/input/Input';
import { Button } from '@/components/button/Button';
import { colors, spacing, typography } from '@/constants/theme';
import type { DownloadFileInput } from '@/hooks/generated/types';
import { useDownloadSearch } from '../hooks/useDownloadSearch';
import { useDownloads } from '../hooks/useDownloads';
import { useStartDownload } from '../hooks/useStartDownload';
import { DownloadSearchResults } from '../components/DownloadSearchResults';
import { DownloadsList } from '../components/DownloadsList';

type Props = {
  initialQuery?: string;
};

export function FindMusicScreen({ initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const lastAutoQuery = useRef<string | null>(null);

  const {
    search,
    searchResult,
    searching,
    isComplete,
    error: searchError,
  } = useDownloadSearch();

  const { downloads, loading: downloadsLoading, error: downloadsError } =
    useDownloads();

  const {
    startDownload,
    loading: downloading,
    error: downloadError,
    clearError: clearDownloadError,
  } = useStartDownload();

  const handleSearch = useCallback(() => {
    clearDownloadError();
    void search(query);
  }, [search, query, clearDownloadError]);

  useEffect(() => {
    const q = initialQuery.trim();
    if (!q || q === lastAutoQuery.current) return;
    lastAutoQuery.current = q;
    setQuery(q);
    clearDownloadError();
    void search(q);
  }, [initialQuery, search, clearDownloadError]);

  const handleDownload = useCallback(
    (peer: string, files: DownloadFileInput[]) => {
      void startDownload(peer, files);
    },
    [startDownload],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find music</Text>
        <Text style={styles.subtitle}>
          Search Soulseek and add music to your library
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <Input
            placeholder="Artist, album, or track…"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <Button
          title="Search"
          variant="primary"
          size="md"
          onPress={handleSearch}
          disabled={searching || query.trim().length === 0}
        />
      </View>

      {downloadError ? (
        <Text style={styles.errorText}>
          Failed to add: {downloadError.message}
        </Text>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <DownloadSearchResults
          searchResult={searchResult}
          searching={searching}
          isComplete={isComplete}
          error={searchError}
          onDownload={handleDownload}
          downloading={downloading}
        />

        <View style={styles.transfersSection}>
          <DownloadsList
            downloads={downloads}
            loading={downloadsLoading}
            error={downloadsError}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  transfersSection: {
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});
