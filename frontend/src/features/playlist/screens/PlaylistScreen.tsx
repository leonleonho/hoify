import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  PlaylistDocument,
  MyPlaylistsDocument,
  ReorderPlaylistTracksDocument,
} from '@/hooks/generated';
import type { Track } from '@/hooks/generated/types';
import { useMusicPlayer } from '@/features/player/hooks/useMusicPlayer';
import { SongListItem } from '@/components/list/SongListItem';
import { ReorderableTrackList } from '@/components/list/ReorderableTrackList';
import { Button } from '@/components/button/Button';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { ListMusic, Heart, MoreVertical } from 'lucide-react-native';
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
  const { data: myPlaylistsData } = useQuery(MyPlaylistsDocument);
  const [reorderTracks, { loading: savingOrder }] = useMutation(
    ReorderPlaylistTracksDocument,
  );

  const [reordering, setReordering] = useState(false);
  const [orderedTracks, setOrderedTracks] = useState<Track[]>([]);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const optionsRef = useRef<View>(null);

  const queryTracks = useMemo(() => {
    if (!data?.playlist) return [];
    return data.playlist.tracks as unknown as Track[];
  }, [data]);

  // Keep local order in sync with server when not actively reordering
  useEffect(() => {
    if (!reordering) {
      setOrderedTracks(queryTracks);
    }
  }, [queryTracks, reordering]);

  const canEdit = useMemo(() => {
    const mine = myPlaylistsData?.myPlaylists ?? [];
    return mine.some((p) => p.id === playlistId);
  }, [myPlaylistsData, playlistId]);

  const tracks = reordering ? orderedTracks : queryTracks;

  const handlePlayAll = () => {
    if (tracks.length > 0) playPlaylist(tracks, 0);
  };

  const handleTrackPress = (index: number) => {
    playPlaylist(tracks, index);
  };

  const handleOpenOptions = () => {
    optionsRef.current?.measureInWindow((x, y, width, height) => {
      setMenuPosition({ x: x + width, y: y + height });
      setMenuVisible(true);
    });
  };

  const handleStartReorder = useCallback(() => {
    setOrderedTracks(queryTracks);
    setReorderError(null);
    setIsDragging(false);
    setReordering(true);
  }, [queryTracks]);

  const handleOrderChange = useCallback((next: Track[]) => {
    setOrderedTracks(next);
  }, []);

  const handleDoneReorder = useCallback(async () => {
    setReorderError(null);
    const trackIds = orderedTracks.map((t) => t.id);
    const unchanged =
      trackIds.length === queryTracks.length &&
      trackIds.every((id, i) => id === queryTracks[i]?.id);

    if (unchanged) {
      setReordering(false);
      setIsDragging(false);
      return;
    }

    try {
      await reorderTracks({
        variables: {
          input: { playlistId, trackIds },
        },
        refetchQueries: [{ query: PlaylistDocument, variables: { id: playlistId } }],
      });
      setReordering(false);
      setIsDragging(false);
    } catch (err) {
      setReorderError(
        err instanceof Error ? err.message : 'Failed to save track order',
      );
    }
  }, [orderedTracks, queryTracks, playlistId, reorderTracks]);

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
  const showOptions = canEdit && tracks.length > 0;

  const headerContent = (
    <View>
      <View style={styles.header}>
        {showOptions && !reordering ? (
          <View style={styles.optionsRow}>
            <View ref={optionsRef}>
              <Pressable
                onPress={handleOpenOptions}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.optionsButton,
                  pressed ? styles.optionsButtonPressed : undefined,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Playlist options"
              >
                <MoreVertical size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        ) : null}

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

      {tracks.length > 0 && !reordering && (
        <Button title="Play All" onPress={handlePlayAll} />
      )}

      {reordering && (
        <Button
          title="Done"
          variant="secondary"
          onPress={handleDoneReorder}
          loading={savingOrder}
          disabled={savingOrder}
        />
      )}

      {reorderError ? (
        <Text style={styles.reorderError}>{reorderError}</Text>
      ) : null}

      {tracks.length > 0 && (
        <Text style={styles.sectionHeader}>
          {reordering ? 'DRAG TO REORDER' : 'TRACKS'}
        </Text>
      )}
    </View>
  );

  if (reordering) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        scrollEnabled={!isDragging && !savingOrder}
      >
        {headerContent}
        <ReorderableTrackList
          tracks={orderedTracks}
          onOrderChange={handleOrderChange}
          disabled={savingOrder}
          onDraggingChange={setIsDragging}
        />
      </ScrollView>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        data={tracks}
        keyExtractor={(track) => track.id}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.cardItem,
              index === 0 && styles.cardItemFirst,
              index === tracks.length - 1 && styles.cardItemLast,
            ]}
          >
            <SongListItem
              track={item}
              onPress={() => handleTrackPress(index)}
              divider={index < tracks.length - 1}
            />
          </View>
        )}
        ListHeaderComponent={headerContent}
      />
      <ContextMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        position={menuPosition}
        items={[
          {
            label: 'Reorder tracks',
            onPress: handleStartReorder,
          },
        ]}
      />
    </>
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
  optionsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  optionsButton: {
    padding: spacing.sm,
    borderRadius: 8,
  },
  optionsButtonPressed: {
    opacity: 0.7,
    backgroundColor: colors.surfaceLight,
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
  reorderError: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sectionHeader: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: spacing.xs,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
