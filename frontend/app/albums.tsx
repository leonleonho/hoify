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
import { AlbumsDocument } from '@/hooks/generated';
import { colors, spacing, typography } from '@/constants/theme';
import { ListItem } from '@/components/list/List';

const PAGE_SIZE = 100;

export default function AlbumsPage() {
  const router = useRouter();
  const [loadingMore, setLoadingMore] = useState(false);
  const { data, loading, error, fetchMore } = useQuery(AlbumsDocument, {
    variables: { limit: PAGE_SIZE, offset: 0 },
  });

  const albums = data?.albums.items ?? [];
  const totalCount = data?.albums.totalCount ?? 0;
  const hasMore = albums.length < totalCount;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    fetchMore({
      variables: { limit: PAGE_SIZE, offset: albums.length },
    }).finally(() => setLoadingMore(false));
  }, [albums.length, fetchMore, hasMore, loadingMore]);

  if (loading && albums.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load albums: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>ALL ALBUMS</Text>
        <View style={styles.listCard}>
          <FlatList
            data={albums}
            keyExtractor={(item) => item.id}
            renderItem={({ item: album }) => (
              <ListItem
                title={album.title}
                subtitle={album.artist.name}
                onPress={() => router.push(`/album/${album.id}` as any)}
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
