import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerCommand } from '@rntp/player';
import {
  setupPlayer,
  setOnStatus,
  setOnQueueTransition,
  setQueue,
  reloadActiveItem,
  saveSnapshot,
  popSnapshot,
  getActivePlaylistIndex,
  canSkipNextInQueue,
  skipToNextInQueue,
  refreshPlaybackState,
} from '../AudioManager';
import { mockTrackPlayer, fireTrackPlayerEvent, TrackPlayerEvent } from '@/test/setup';

const tracks = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    mediaId: `t${i}`,
    url: `http://example.com/t${i}`,
    playlistIndex: i,
  }));

describe('AudioManager', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('setupPlayer configures progress sync and hybrid seek handling', async () => {
    await setupPlayer();
    expect(mockTrackPlayer.setupPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        progressSync: { intervalSeconds: 0.25 },
        android: { wakeMode: 'network' },
      }),
    );
    expect(mockTrackPlayer.setCommands).toHaveBeenCalledWith(
      expect.objectContaining({
        handling: 'hybrid',
        perCommandHandling: { [PlayerCommand.Seek]: 'js' },
      }),
    );
  });

  it('setQueue loads the entire playlist into the native queue', async () => {
    await setQueue(tracks(10), 5, false, 0.8);
    const [queueItems, queueIndex] = mockTrackPlayer.setMediaItems.mock.calls[0];
    expect(queueItems).toHaveLength(10);
    expect(queueItems[0].extras?.playlistIndex).toBe(0);
    expect(queueItems.at(-1)?.extras?.playlistIndex).toBe(9);
    expect(queueIndex).toBe(5);
    expect(getActivePlaylistIndex()).toBe(5);
  });

  it('PlaybackProgressUpdated uses event payload for position', async () => {
    const onStatus = vi.fn();
    setOnStatus(onStatus);
    await setupPlayer();

    fireTrackPlayerEvent(TrackPlayerEvent.PlaybackProgressUpdated, {
      position: 42,
      duration: 200,
    });

    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        positionMillis: 42000,
        durationMillis: 200000,
      }),
    );
  });

  it('MediaItemTransition notifies queue transition callback', async () => {
    const onTransition = vi.fn();
    setOnQueueTransition(onTransition);
    await setupPlayer();

    fireTrackPlayerEvent(TrackPlayerEvent.MediaItemTransition, {
      item: { extras: { playlistIndex: 3 } },
      index: 1,
    });

    expect(onTransition).toHaveBeenCalledWith(3);
  });

  it('MediaItemTransition emits position zero despite stale native progress', async () => {
    const onStatus = vi.fn();
    setOnStatus(onStatus);
    await setupPlayer();
    mockTrackPlayer.seekTo(90);
    onStatus.mockClear();

    fireTrackPlayerEvent(TrackPlayerEvent.MediaItemTransition, {
      item: { mediaId: 't1', extras: { playlistIndex: 1 } },
      index: 1,
    });

    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ positionMillis: 0 }),
    );
  });

  it('ignores stale PlaybackProgressUpdated from the previous track', async () => {
    const onStatus = vi.fn();
    setOnStatus(onStatus);
    await setupPlayer();

    fireTrackPlayerEvent(TrackPlayerEvent.MediaItemTransition, {
      item: { mediaId: 't1', extras: { playlistIndex: 1 } },
      index: 1,
    });
    onStatus.mockClear();

    fireTrackPlayerEvent(TrackPlayerEvent.PlaybackProgressUpdated, {
      mediaId: 't0',
      position: 90,
      duration: 200,
    });
    expect(onStatus).not.toHaveBeenCalled();

    fireTrackPlayerEvent(TrackPlayerEvent.PlaybackProgressUpdated, {
      mediaId: 't1',
      position: 0.5,
      duration: 200,
    });
    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ positionMillis: 500 }),
    );
  });

  it('ignores high position on new track shortly after transition', async () => {
    const onStatus = vi.fn();
    setOnStatus(onStatus);
    await setQueue(tracks(2), 0, false, 0.8);
    mockTrackPlayer.seekTo(90);
    onStatus.mockClear();

    fireTrackPlayerEvent(TrackPlayerEvent.MediaItemTransition, {
      item: { mediaId: 't1', extras: { playlistIndex: 1 } },
      index: 1,
    });
    onStatus.mockClear();

    fireTrackPlayerEvent(TrackPlayerEvent.PlaybackProgressUpdated, {
      mediaId: 't1',
      position: 90,
      duration: 200,
    });
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('IsPlayingChanged reports zero after transition when native progress is stale', async () => {
    const onStatus = vi.fn();
    setOnStatus(onStatus);
    await setQueue(tracks(2), 0, false, 0.8);
    mockTrackPlayer.seekTo(75);
    onStatus.mockClear();

    fireTrackPlayerEvent(TrackPlayerEvent.MediaItemTransition, {
      item: { mediaId: 't1', extras: { playlistIndex: 1 } },
      index: 1,
    });
    onStatus.mockClear();

    fireTrackPlayerEvent(TrackPlayerEvent.IsPlayingChanged, { playing: true });
    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ positionMillis: 0 }),
    );
  });

  it('refreshPlaybackState zeroes stale progress after track change', async () => {
    const onStatus = vi.fn();
    setOnStatus(onStatus);
    await setQueue(tracks(2), 0, false, 0.8);
    mockTrackPlayer.seekTo(60);

    fireTrackPlayerEvent(TrackPlayerEvent.MediaItemTransition, {
      item: { mediaId: 't1', extras: { playlistIndex: 1 } },
      index: 1,
    });
    onStatus.mockClear();

    refreshPlaybackState();
    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ positionMillis: 0 }),
    );
  });

  it('skipToNextInQueue advances within the loaded window', async () => {
    await setQueue(tracks(4), 1, false, 0.8);
    expect(canSkipNextInQueue()).toBe(true);
    expect(skipToNextInQueue()).toBe(true);
    expect(mockTrackPlayer.skipToNext).toHaveBeenCalled();
    expect(getActivePlaylistIndex()).toBe(2);
  });

  it('reloadActiveItem replaces the active queue item', async () => {
    await setQueue(tracks(1), 0, false, 0.8);
    await reloadActiveItem('http://example.com/reloaded', true, 0.5, undefined, 0);
    expect(mockTrackPlayer.replaceMediaItem).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ url: 'http://example.com/reloaded' }),
    );
    expect(mockTrackPlayer.play).toHaveBeenCalled();
  });

  it('saveSnapshot and popSnapshot round-trip player state', () => {
    const snap = {
      currentTrack: { id: 't1' },
      playlist: [{ id: 't1' }],
      isPlaying: true,
      isLoading: false,
      position: 12000,
      duration: 200000,
      volume: 0.7,
      quality: 'high',
      repeatMode: 'off',
      shuffle: false,
      playlistIndex: 0,
    };
    saveSnapshot(snap);
    expect(popSnapshot()).toEqual(snap);
    expect(popSnapshot()).toBeNull();
  });

  it('refreshPlaybackState notifies the status callback', async () => {
    const onStatus = vi.fn();
    setOnStatus(onStatus);
    await setupPlayer();
    onStatus.mockClear();

    refreshPlaybackState();

    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ positionMillis: 0 }),
    );
  });
});
