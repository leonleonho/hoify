import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useQuery } from '@apollo/client/react';
import { PlaylistDocument } from '@/hooks/generated';
import type { Track } from '@/hooks/generated/types';
import { useMusicPlayer } from '@/features/player/hooks/useMusicPlayer';
import { List } from '@/components/list/List';
import { SongListItem } from '@/components/list/SongListItem';
import { Button } from '@/components/button/Button';
import { ListMusic, Heart } from 'lucide-react-native';
import { colors, spacing, typography } from '@/constants/theme';
import { PlaylistType } from '@/hooks/generated/types';

type Props = {
  playlistId: string;
};

export function PlaylistScreen({ playlistId }: Props) {
  const { playPlaylist } = useMusicPlayer();
  const { data, loading, error } = useQuery(PlaylistDocument, {
    variables: { id: playlistId },
  });

  const tracks = useMemo(() => {
    if (!data?.playlist) return [];
    return data.playlist.tracks as unknown as Track[];
  }, [data]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data?.playlist) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {error ? `Failed to load playlist: ${error.message}` : 'Playlist not found'}
        </Text>
      </View>
    );
  }

  const playlist = data.playlist;
  const isLiked = playlist.type === PlaylistType.Liked;

  const handlePlayAll = () => {
    if (tracks.length > 0) playPlaylist(tracks, 0);
  };

  const handleTrackPress = (index: number) => {
    playPlaylist(tracks, index);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Playlist header */}
      <View style={styles.header}>
        <View style={[styles.iconBg, isLiked && styles.likedBg]}>
          {isLiked ? (
            <Heart size={48} color={colors.primary} fill={colors.primary} />
          ) : (
            <ListMusic size={48} color={colors.textSecondary} />
          )}
        </View>
        <Text style={styles.playlistName}>{playlist.name}</Text>
        {playlist.description && (
          <Text style={styles.description}>{playlist.description}</Text>
        )}
        <Text style={styles.meta}>
          {playlist.trackCount} {playlist.trackCount === 1 ? 'track' : 'tracks'}
          {!isLiked && !playlist.isPublic ? ' · Private' : ''}
        </Text>
      </View>

      {/* Play All button */}
      {tracks.length > 0 && <Button title="Play All" onPress={handlePlayAll} />}

      {/* Tracks */}
      {tracks.length > 0 && (
        <List header="TRACKS">
          {tracks.map((track, index) => (
            <SongListItem
              key={track.id}
              track={track}
              onPress={() => handleTrackPress(index)}
              divider={index < tracks.length - 1}
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
  iconBg: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likedBg: {
    backgroundColor: colors.surfaceLight,
  },
  playlistName: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
});
