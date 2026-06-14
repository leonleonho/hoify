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
import { useRouter } from 'expo-router';
import { ArtistDocument } from '@/hooks/generated';
import type { Track } from '@/hooks/generated';
import { useMusicPlayer } from '@/features/player/hooks/useMusicPlayer';
import { List, ListItem } from '@/components/list/List';
import { colors, spacing, typography } from '@/constants/theme';
import { formatTime } from '@/features/player/utils/formatTime';

type Props = {
  artistId: string;
};

export function ArtistScreen({ artistId }: Props) {
  const router = useRouter();
  const { playPlaylist } = useMusicPlayer();
  const { data, loading, error } = useQuery(ArtistDocument, {
    variables: { id: artistId },
  });

  const allTracks = useMemo(() => {
    if (!data?.artist) return [];
    const tracks: Track[] = [];
    for (const album of data.artist.albums) {
      for (const track of album.tracks) {
        tracks.push({
          ...track,
          album: {
            __typename: 'Album',
            id: album.id,
            title: album.title,
            coverUrl: album.coverUrl,
            releaseYear: album.releaseYear,
            artist: album.artist,
            tracks: [],
            createdAt: '',
            updatedAt: '',
          },
        } as unknown as Track);
      }
    }
    return tracks;
  }, [data]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data?.artist) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error ? `Failed to load artist: ${error.message}` : 'Artist not found'}
        </Text>
      </View>
    );
  }

  const artist = data.artist!;

  const handleAlbumPress = (albumId: string) => {
    router.push(`/album/${albumId}` as any);
  };

  const handleTrackPress = (index: number) => {
    playPlaylist(allTracks, index);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Artist header */}
      <View style={styles.header}>
        {artist.imageUrl && (
          <Image
            source={{ uri: artist.imageUrl }}
            style={styles.artistImage}
          />
        )}
        <Text style={styles.artistName}>{artist.name}</Text>
        {artist.bio && <Text style={styles.bio}>{artist.bio}</Text>}
      </View>

      {/* Albums */}
      {artist.albums.length > 0 && (
        <List header="ALBUMS">
          {artist.albums.map((album) => (
            <ListItem
              key={album.id}
              title={album.title}
              subtitle={album.releaseYear?.toString() ?? ''}
              onPress={() => handleAlbumPress(album.id)}
              divider
            />
          ))}
        </List>
      )}

      {/* Songs */}
      {allTracks.length > 0 && (
        <List header="SONGS">
          {allTracks.map((track, index) => (
            <ListItem
              key={track.id}
              title={track.title}
              subtitle={track.duration ? formatTime(track.duration * 1000) : ''}
              onPress={() => handleTrackPress(index)}
              divider={index < allTracks.length - 1}
            />
          ))}
        </List>
      )}
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
  artistImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.surfaceLight,
  },
  artistName: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  bio: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
});
