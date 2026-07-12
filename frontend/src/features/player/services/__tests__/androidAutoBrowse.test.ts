import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaylistType } from '@/hooks/generated/types';
import {
  buildBrowseTrackItem,
  buildPlaylistsBrowseCategory,
  syncAndroidAutoBrowseTree,
  getCachedPlaylistTracks,
  setCachedPlaylistTracks,
  _resetBrowseCacheForTests,
} from '../androidAutoBrowse';
import { mockTrackPlayer } from '@/test/setup';
import { mockTrack1, mockTrack2 } from '../../components/__tests__/utils';
import { setApiBase } from '@/constants/api';

describe('androidAutoBrowse', () => {
  beforeEach(() => {
    _resetBrowseCacheForTests();
    setApiBase('http://localhost:4000');
    vi.clearAllMocks();
  });

  it('buildBrowseTrackItem uses unique mediaId, original stream URL, and extras', () => {
    const item = buildBrowseTrackItem('pl-1', mockTrack1, 2);
    expect(item.mediaId).toBe('pl-1:track-1');
    expect(item.url).toBe('http://localhost:4000/stream/track-1?quality=original');
    expect(item.title).toBe(mockTrack1.title);
    expect(item.artist).toBe(mockTrack1.album.artist.name);
    expect(item.duration).toBe(200);
    expect(item.extras).toEqual({
      playlistId: 'pl-1',
      playlistIndex: 2,
      trackId: 'track-1',
    });
  });

  it('buildPlaylistsBrowseCategory nests tracks under playlist containers', () => {
    const category = buildPlaylistsBrowseCategory([
      { id: 'liked', name: 'Liked Songs', tracks: [mockTrack1, mockTrack2] },
      { id: 'empty', name: 'Empty', tracks: [] },
    ]);

    expect(category.mediaId).toBe('playlists');
    expect(category.title).toBe('Playlists');
    expect(category.items).toHaveLength(1);
    expect(category.items[0].mediaId).toBe('playlist:liked');
    expect(category.items[0].title).toBe('Liked Songs');
    expect(category.items[0].url).toBeUndefined();
    expect(category.items[0].children).toHaveLength(2);
    expect(category.items[0].children![0].mediaId).toBe('liked:track-1');
    expect(category.items[0].children![1].extras?.playlistIndex).toBe(1);
  });

  it('syncAndroidAutoBrowseTree caches tracks and calls setBrowseTree', async () => {
    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({
          data: {
            myPlaylists: [
              { id: 'pl-a', name: 'Chill', type: null, trackCount: 2, isPublic: false },
              { id: 'liked', name: 'Liked', type: PlaylistType.Liked, trackCount: 1, isPublic: false },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: { playlist: { id: 'liked', name: 'Liked', tracks: [mockTrack1] } },
        })
        .mockResolvedValueOnce({
          data: { playlist: { id: 'pl-a', name: 'Chill', tracks: [mockTrack1, mockTrack2] } },
        }),
    };

    const category = await syncAndroidAutoBrowseTree(client as any);

    expect(getCachedPlaylistTracks('liked')).toEqual([mockTrack1]);
    expect(getCachedPlaylistTracks('pl-a')).toHaveLength(2);
    expect(mockTrackPlayer.setBrowseTree).toHaveBeenCalledTimes(1);
    const [tree] = mockTrackPlayer.setBrowseTree.mock.calls[0];
    expect(tree).toHaveLength(1);
    // Liked sorted first
    expect(tree[0].items[0].mediaId).toBe('playlist:liked');
    expect(tree[0].items[1].mediaId).toBe('playlist:pl-a');
    expect(category?.items).toHaveLength(2);
  });

  it('syncAndroidAutoBrowseTree clears tree when there are no playlists', async () => {
    setCachedPlaylistTracks('stale', [mockTrack1]);
    const client = {
      query: vi.fn().mockResolvedValue({ data: { myPlaylists: [] } }),
    };

    const category = await syncAndroidAutoBrowseTree(client as any);

    expect(category).toBeNull();
    expect(getCachedPlaylistTracks('stale')).toBeUndefined();
    expect(mockTrackPlayer.setBrowseTree).toHaveBeenCalledWith([]);
  });
});
