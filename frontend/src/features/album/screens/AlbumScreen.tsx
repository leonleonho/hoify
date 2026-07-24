import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@apollo/client/react';
import { useRouter } from 'expo-router';
import { AlbumDocument } from '@/hooks/generated';
import type { Track } from '@/hooks/generated/types';
import { useMusicPlayer } from '@/features/player/hooks/useMusicPlayer';
import { useCanModerate } from '@/features/auth/hooks/useCanModerate';
import { SongListItem } from '@/components/list/SongListItem';
import { Button } from '@/components/button/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { artUrl } from '@/constants/api';

type Props = {
  albumId: string;
};

export function AlbumScreen({ albumId }: Props) {
  const router = useRouter();
  const { canModerate } = useCanModerate();
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

  const headerComponent = (
    <View>
      <View style={styles.header}>
        {album.coverUrl && (
          <Image
            source={{ uri: artUrl(album.coverUrl) }}
            style={styles.coverImage}
          />
        )}
        <Text style={styles.albumTitle}>{album.title}</Text>
        <Text style={styles.artistName}>{album.artist.name}</Text>
        {album.releaseYear && (
          <Text style={styles.releaseYear}>{album.releaseYear}</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Button title="Play All" onPress={handlePlayAll} />
        {canModerate ? (
          <Button
            title="Edit"
            variant="secondary"
            onPress={() => router.push(`/album/${albumId}/edit` as any)}
          />
        ) : null}
      </View>

      {tracksWithAlbum.length > 0 && (
        <Text style={styles.sectionHeader}>TRACKS</Text>
      )}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      data={tracksWithAlbum}
      keyExtractor={(track) => track.id}
      renderItem={({ item, index }) => (
        <View
          style={[
            styles.cardItem,
            index === 0 && styles.cardItemFirst,
            index === tracksWithAlbum.length - 1 && styles.cardItemLast,
          ]}
        >
          <SongListItem
            track={item}
            onPress={() => handleTrackPress(index)}
            divider={index < tracksWithAlbum.length - 1}
          />
        </View>
      )}
      ListHeaderComponent={headerComponent}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
  },
  cardItem: {
    backgroundColor: colors.surface,
  },
  cardItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  cardItemLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
});
