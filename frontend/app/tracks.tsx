import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TracksDocument } from '@/hooks/generated';
import type { Track } from '@/hooks/generated/types';
import { colors, spacing, typography } from '@/constants/theme';
import { SongListItem } from '@/components/list/SongListItem';
import { useMusicPlayer } from '@/features/player/hooks/useMusicPlayer';

const PAGE_SIZE = 100;

export default function TracksPage() {
  const [loadingMore, setLoadingMore] = useState(false);
  const { playPlaylist } = useMusicPlayer();
  const { data, loading, error, fetchMore } = useQuery(TracksDocument, {
    variables: { limit: PAGE_SIZE, offset: 0 },
  });

  const tracks = useMemo(
    () => (data?.tracks.items ?? []) as unknown as Track[],
    [data],
  );
  const totalCount = data?.tracks.totalCount ?? 0;
  const hasMore = tracks.length < totalCount;

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    fetchMore({
      variables: { limit: PAGE_SIZE, offset: tracks.length },
    }).finally(() => setLoadingMore(false));
  }, [tracks.length, fetchMore, hasMore, loadingMore]);

  const handleTrackPress = useCallback(
    (index: number) => {
      playPlaylist(tracks, index);
    },
    [playPlaylist, tracks],
  );

  if (loading && tracks.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load songs: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>ALL SONGS</Text>
        <View style={styles.listCard}>
          <FlatList
            data={tracks}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <SongListItem
                track={item}
                onPress={() => handleTrackPress(index)}
                divider={index < tracks.length - 1}
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
