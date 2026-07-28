import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useQuery } from '@apollo/client/react';
import { MyPlaylistsDocument } from '@/hooks/generated';
import { colors, spacing, typography } from '@/constants/theme';
import { PlaylistTile } from './PlaylistTile';
import { PlaylistType } from '@/hooks/generated/types';
import { useOffline } from '@/features/offline/OfflineProvider';

type Props = {
  onPlaylistPress?: (id: string) => void;
};

type PlaylistSummary = {
  id: string;
  name: string;
  trackCount: number;
  type?: string | null;
};

export function PlaylistRow({ onPlaylistPress }: Props) {
  const { data, loading } = useQuery(MyPlaylistsDocument, {
    errorPolicy: 'all',
  });
  const { isOffline } = useOffline();

  const sorted = useMemo((): PlaylistSummary[] => {
    if (!data?.myPlaylists?.length) return [];

    const playlists = [...data.myPlaylists];
    playlists.sort((a, b) => {
      if (a.type === PlaylistType.Liked) return -1;
      if (b.type === PlaylistType.Liked) return 1;
      return 0;
    });
    return playlists.slice(0, 10).map((p) => ({
      id: p.id,
      name: p.name,
      trackCount: p.trackCount,
      type: p.type,
    }));
  }, [data]);

  if (loading && sorted.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.header}>Your Playlists</Text>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (sorted.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.header}>Your Playlists</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {sorted.map((playlist) => (
          <PlaylistTile
            key={playlist.id}
            id={playlist.id}
            name={playlist.name}
            trackCount={playlist.trackCount}
            isLiked={playlist.type === PlaylistType.Liked}
            offlineReady={isOffline(playlist.id)}
            onPress={
              onPlaylistPress
                ? () => onPlaylistPress(playlist.id)
                : undefined
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  header: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  row: {
    paddingHorizontal: spacing.md,
  },
});
