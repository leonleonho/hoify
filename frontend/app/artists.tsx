import { useCallback, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArtistsDocument } from '@/hooks/generated';
import { colors, spacing, typography } from '@/constants/theme';
import { ListItem } from '@/components/list/List';

const PAGE_SIZE = 100;

export default function ArtistsPage() {
  const router = useRouter();
  const [loadingMore, setLoadingMore] = useState(false);
  const { data, loading, error, fetchMore } = useQuery(ArtistsDocument, {
    variables: { limit: PAGE_SIZE, offset: 0 },
  });

  const artists = data?.artists.items ?? [];
  const totalCount = data?.artists.totalCount ?? 0;
  const hasMore = artists.length < totalCount;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    fetchMore({
      variables: { limit: PAGE_SIZE, offset: artists.length },
    }).finally(() => setLoadingMore(false));
  }, [artists.length, fetchMore, hasMore, loadingMore]);

  if (loading && artists.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load artists: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>ALL ARTISTS</Text>
        <View style={styles.listCard}>
          <FlatList
            data={artists}
            keyExtractor={(item) => item.id}
            renderItem={({ item: artist }) => (
              <ListItem
                title={artist.name}
                subtitle="Artist"
                onPress={() => router.push(`/artist/${artist.id}` as any)}
                divider
              />
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footer}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
  },
  listCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
