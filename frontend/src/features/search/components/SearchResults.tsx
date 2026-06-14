import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { List, ListItem } from '@/components/list/List';
import { colors, spacing, typography } from '@/constants/theme';
import { useMusicPlayer } from '@/features/player/hooks/useMusicPlayer';
import type { SearchMusicQuery, Track } from '@/hooks/generated';

type SearchResultsData = SearchMusicQuery['searchMusic'];

type SearchResultsProps = {
  data: SearchResultsData;
  loading: boolean;
  error: Error | null;
};

export function SearchResults({ data, loading, error }: SearchResultsProps) {
  const { playPlaylist } = useMusicPlayer();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Search failed: {error.message}</Text>
      </View>
    );
  }

  const hasArtists = data.artists.length > 0;
  const hasAlbums = data.albums.length > 0;
  const hasTracks = data.tracks.length > 0;

  if (!hasArtists && !hasAlbums && !hasTracks) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No results found</Text>
      </View>
    );
  }

  const handleTrackPress = (index: number) => {
    playPlaylist(data.tracks as Track[], index);
  };

  return (
    <View style={styles.container}>
      {hasArtists && (
        <List header="ARTISTS">
          {data.artists.map((artist) => (
            <ListItem
              key={artist.id}
              title={artist.name}
              subtitle="Artist"
              divider
            />
          ))}
        </List>
      )}

      {hasAlbums && (
        <List header="ALBUMS">
          {data.albums.map((album) => (
            <ListItem
              key={album.id}
              title={album.title}
              subtitle={album.artist.name}
              divider
            />
          ))}
        </List>
      )}

      {hasTracks && (
        <List header="TRACKS">
          {data.tracks.map((track, index) => (
            <ListItem
              key={track.id}
              title={track.title}
              subtitle={`${track.album.artist.name} · ${track.album.title}`}
              onPress={() => handleTrackPress(index)}
              divider={index < data.tracks.length - 1}
            />
          ))}
        </List>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
