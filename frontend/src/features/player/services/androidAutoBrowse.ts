import TrackPlayer, { type BrowseCategory, type BrowseItem } from '@rntp/player';
import type { ApolloClient } from '@apollo/client';
import {
  MyPlaylistsDocument,
  PlaylistDocument,
} from '@/hooks/generated';
import { PlaylistType, type Track } from '@/hooks/generated/types';
import { getApiBase, artUrl } from '@/constants/api';

/** Module cache so Auto-started playback can update React UI without refetch. */
const playlistTracksCache = new Map<string, Track[]>();

export function getCachedPlaylistTracks(playlistId: string): Track[] | undefined {
  return playlistTracksCache.get(playlistId);
}

export function _resetBrowseCacheForTests(): void {
  playlistTracksCache.clear();
}

export function setCachedPlaylistTracks(playlistId: string, tracks: Track[]): void {
  playlistTracksCache.set(playlistId, tracks);
}

type PlaylistSummary = {
  id: string;
  name: string;
  type?: string | null;
};

type BrowseTrackInput = {
  id: string;
  title: string;
  trackArtist?: string | null;
  duration?: number | null;
  album?: {
    title?: string | null;
    coverUrl?: string | null;
    artist?: { name?: string | null } | null;
  } | null;
};

function streamUrl(trackId: string): string {
  return `${getApiBase()}/stream/${encodeURIComponent(trackId)}?quality=original`;
}

function trackArtistName(track: BrowseTrackInput): string | undefined {
  return track.trackArtist ?? track.album?.artist?.name ?? undefined;
}

export function buildBrowseTrackItem(
  playlistId: string,
  track: BrowseTrackInput,
  playlistIndex: number,
): BrowseItem {
  return {
    mediaId: `${playlistId}:${track.id}`,
    url: streamUrl(track.id),
    title: track.title,
    artist: trackArtistName(track),
    artworkUrl: track.album?.coverUrl ? artUrl(track.album.coverUrl) : undefined,
    duration: track.duration ?? undefined,
    extras: {
      playlistId,
      playlistIndex,
      trackId: track.id,
    },
  };
}

export function buildPlaylistsBrowseCategory(
  playlists: Array<{ id: string; name: string; tracks: BrowseTrackInput[] }>,
): BrowseCategory {
  const items: BrowseItem[] = playlists
    .filter((p) => p.tracks.length > 0)
    .map((playlist) => ({
      mediaId: `playlist:${playlist.id}`,
      title: playlist.name,
      children: playlist.tracks.map((track, index) =>
        buildBrowseTrackItem(playlist.id, track, index),
      ),
    }));

  return {
    mediaId: 'playlists',
    title: 'Playlists',
    items,
  };
}

function sortPlaylists<T extends PlaylistSummary>(playlists: T[]): T[] {
  return [...playlists].sort((a, b) => {
    if (a.type === PlaylistType.Liked) return -1;
    if (b.type === PlaylistType.Liked) return 1;
    return 0;
  });
}

/**
 * Fetch My Playlists + tracks, update the cache, and push the browse tree to RNTP.
 */
export async function syncAndroidAutoBrowseTree(
  client: ApolloClient,
): Promise<BrowseCategory | null> {
  const { data } = await client.query({
    query: MyPlaylistsDocument,
    fetchPolicy: 'network-only',
  });

  const summaries = sortPlaylists(data?.myPlaylists ?? []);
  if (!summaries.length) {
    playlistTracksCache.clear();
    TrackPlayer.setBrowseTree([]);
    return null;
  }

  const loaded = await Promise.all(
    summaries.map(async (summary) => {
      const result = await client.query({
        query: PlaylistDocument,
        variables: { id: summary.id },
        fetchPolicy: 'network-only',
      });
      const tracks = (result.data?.playlist?.tracks ?? []) as unknown as Track[];
      setCachedPlaylistTracks(summary.id, tracks);
      return {
        id: summary.id,
        name: summary.name,
        tracks,
      };
    }),
  );

  // Drop cache entries for playlists that no longer exist
  const ids = new Set(loaded.map((p) => p.id));
  for (const key of playlistTracksCache.keys()) {
    if (!ids.has(key)) playlistTracksCache.delete(key);
  }

  const category = buildPlaylistsBrowseCategory(loaded);
  TrackPlayer.setBrowseTree([category]);
  return category;
}
