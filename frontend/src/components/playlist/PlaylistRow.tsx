import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useQuery } from '@apollo/client/react';
import { MyPlaylistsDocument } from '@/hooks/generated';
import { colors, spacing, typography } from '@/constants/theme';
import { PlaylistTile } from './PlaylistTile';
import { PlaylistType } from '@/hooks/generated/types';

type Props = {
  onPlaylistPress?: (id: string) => void;
};

export function PlaylistRow({ onPlaylistPress }: Props) {
  const { data, loading } = useQuery(MyPlaylistsDocument);

  const sorted = useMemo(() => {
    if (!data?.myPlaylists) return [];
    const playlists = [...data.myPlaylists];
    playlists.sort((a, b) => {
      if (a.type === PlaylistType.Liked) return -1;
      if (b.type === PlaylistType.Liked) return 1;
      return 0;
    });
    return playlists.slice(0, 10);
  }, [data]);

  if (loading) {
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
