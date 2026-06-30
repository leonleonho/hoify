import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/button/Button';
import { List, ListItem } from '@/components/list/List';
import { SongListItem } from '@/components/list/SongListItem';
import { colors, spacing, typography } from '@/constants/theme';
import { useMusicPlayer } from '@/features/player/hooks/useMusicPlayer';
import { DiscogsResults } from '@/features/search/components/DiscogsResults';
import type { DiscogsResult } from '@/features/search/discogs/types';
import type { SearchMusicQuery } from '@/hooks/generated';
import type { Track } from '@/hooks/generated/types';
type SearchResultsData = SearchMusicQuery['searchMusic'];

type SearchResultsProps = {
  data: SearchResultsData;
  loading: boolean;
  error: Error | null;
  onExtendedSearch?: () => void;
  discogsResults?: DiscogsResult[];
  discogsLoading?: boolean;
  discogsError?: string | null;
  discogsSearched?: boolean;
};

export function SearchResults({
  data,
  loading,
  error,
  onExtendedSearch,
  discogsResults,
  discogsLoading,
  discogsError,
  discogsSearched,
}: SearchResultsProps) {
  const router = useRouter();
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
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No results found</Text>
        </View>
        {!discogsSearched && (
          <View style={styles.extendedSearch}>
            <Text style={styles.extendedText}>Not what you're looking for?</Text>
            <Button
              title="Search on Discogs"
              variant="secondary"
              size="sm"
              onPress={onExtendedSearch}
            />
          </View>
        )}
        {discogsSearched && (
          <DiscogsResults
            results={discogsResults ?? []}
            loading={discogsLoading ?? false}
            error={discogsError ?? null}
          />
        )}
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
              onPress={() => router.push(`/artist/${artist.id}` as any)}
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
              onPress={() => router.push(`/album/${album.id}` as any)}
              divider
            />
          ))}
        </List>
      )}

      {hasTracks && (
        <List header="TRACKS">
          {data.tracks.map((track, index) => (
            <SongListItem
              key={track.id}
              track={track as Track}
              onPress={() => handleTrackPress(index)}
              divider={index < data.tracks.length - 1}
            />
          ))}
        </List>
      )}

      {!discogsSearched && (
        <View style={styles.extendedSearch}>
          <Text style={styles.extendedText}>Not what you're looking for?</Text>
          <Button
            title="Search on Discogs"
            variant="secondary"
            size="sm"
            onPress={onExtendedSearch}
          />
        </View>
      )}

      {discogsSearched && (
        <DiscogsResults
          results={discogsResults ?? []}
          loading={discogsLoading ?? false}
          error={discogsError ?? null}
        />
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
  extendedSearch: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  extendedText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
