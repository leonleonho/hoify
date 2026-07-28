import { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, ListMusic, WifiOff } from 'lucide-react-native';
import { colors, spacing, typography } from '@/constants/theme';
import { PlaylistType } from '@/hooks/generated/types';
import { useOffline } from '../OfflineProvider';

export function OfflineHomeScreen() {
  const router = useRouter();
  const { offlinePlaylists, ready } = useOffline();

  const sorted = useMemo(() => {
    const list = [...offlinePlaylists];
    list.sort((a, b) => {
      if (a.type === PlaylistType.Liked) return -1;
      if (b.type === PlaylistType.Liked) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [offlinePlaylists]);

  if (!ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <WifiOff size={22} color={colors.textMuted} />
        <Text style={styles.title}>Offline</Text>
        <Text style={styles.subtitle}>
          Downloaded playlists you can listen to without a connection.
        </Text>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No offline playlists</Text>
          <Text style={styles.emptyBody}>
            Connect to the internet and download a playlist for offline listening.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isLiked = item.type === PlaylistType.Liked;
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  pressed ? styles.rowPressed : undefined,
                ]}
                onPress={() => router.push(`/playlist/${item.id}` as any)}
              >
                <View style={[styles.iconBg, isLiked && styles.likedBg]}>
                  {isLiked ? (
                    <Heart size={24} color={colors.primary} fill={colors.primary} />
                  ) : (
                    <ListMusic size={24} color={colors.textSecondary} />
                  )}
                </View>
                <View style={styles.meta}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.count}>
                    {item.trackCount}{' '}
                    {item.trackCount === 1 ? 'track' : 'tracks'}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
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
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedBg: {
    backgroundColor: colors.background,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  count: {
    ...typography.caption,
    color: colors.textMuted,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
