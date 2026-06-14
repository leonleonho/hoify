import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@apollo/client/react';
import { AlbumDocument } from '@/hooks/generated';
import type { Track } from '@/hooks/generated';
import { useMusicPlayer } from '@/features/player/hooks/useMusicPlayer';
import { List, ListItem } from '@/components/list/List';
import { Button } from '@/components/button/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { formatTime } from '@/features/player/utils/formatTime';

type Props = {
  albumId: string;
};

export function AlbumScreen({ albumId }: Props) {
  const { playPlaylist } = useMusicPlayer();
  const { data, loading, error } = useQuery(AlbumDocument, {
    variables: { id: albumId },
  });

  const tracksWithAlbum = useMemo(() => {
    if (!data?.album) return [];
    const { album } = data;
    return album.tracks.map((track) => ({
      ...track,
      album: {
        __typename: 'Album' as const,
        id: album.id,
        title: album.title,
        coverUrl: album.coverUrl,
        releaseYear: album.releaseYear,
        artist: album.artist,
        tracks: [],
        createdAt: '',
        updatedAt: '',
      },
    })) as unknown as Track[];
  }, [data]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data?.album) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error ? `Failed to load album: ${error.message}` : 'Album not found'}
        </Text>
      </View>
    );
  }

  const album = data.album!;

  const handlePlayAll = () => {
    playPlaylist(tracksWithAlbum, 0);
  };

  const handleTrackPress = (index: number) => {
    playPlaylist(tracksWithAlbum, index);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Album header */}
      <View style={styles.header}>
        {album.coverUrl && (
          <Image
            source={{ uri: album.coverUrl }}
            style={styles.coverImage}
          />
        )}
        <Text style={styles.albumTitle}>{album.title}</Text>
        <Text style={styles.artistName}>{album.artist.name}</Text>
        {album.releaseYear && (
          <Text style={styles.releaseYear}>{album.releaseYear}</Text>
        )}
      </View>

      {/* Play All button */}
      <Button title="Play All" onPress={handlePlayAll} />

      {/* Tracks */}
      <List header="TRACKS">
        {album.tracks.map((track, index) => (
          <ListItem
            key={track.id}
            title={track.title}
            subtitle={
              track.duration
                ? formatTime(track.duration * 1000)
                : ''
            }
            onPress={() => handleTrackPress(index)}
            divider={index < album.tracks.length - 1}
          />
        ))}
      </List>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  coverImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
  },
  albumTitle: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  artistName: {
    ...typography.h2,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  releaseYear: {
    ...typography.body,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
});
