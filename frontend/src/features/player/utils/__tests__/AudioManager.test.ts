import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerCommand } from '@rntp/player';
import {
  setupPlayer,
  setOnStatus,
  setOnQueueTransition,
  setQueue,
  reloadActiveItem,
  setVolumeAsync,
  saveSnapshot,
  popSnapshot,
  getActivePlaylistIndex,
  canSkipNextInQueue,
  skipToNextInQueue,
  refreshPlaybackState,
  hasActiveSound,
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

    expect(onTransition).toHaveBeenCalledWith(3, { playlistIndex: 3, nativeIndex: 1 });
  });

  it('MediaItemTransition passes browse extras and marks active sound loaded', async () => {
    const onTransition = vi.fn();
    setOnQueueTransition(onTransition);
    await setupPlayer();

    fireTrackPlayerEvent(TrackPlayerEvent.MediaItemTransition, {
      item: {
        mediaId: 'pl-1:track-1',
        extras: { playlistIndex: 0, playlistId: 'pl-1', trackId: 'track-1' },
      },
      index: 0,
    });

    expect(onTransition).toHaveBeenCalledWith(0, {
      playlistIndex: 0,
      playlistId: 'pl-1',
      trackId: 'track-1',
      nativeIndex: 0,
    });
    expect(hasActiveSound()).toBe(true);
  });

  it('setQueue applies effective volume = userVolume × gain of the starting track', async () => {
    await setupPlayer();
    mockTrackPlayer.setVolume(0.8); // seed user volume
    await setQueue(
      [{ mediaId: 't0', url: 'u', playlistIndex: 0, gain: 0.5 }],
      0,
      false,
      0.8,
    );
    expect(mockTrackPlayer.getVolume()).toBeCloseTo(0.4);
  });

  it('setVolumeAsync folds the active track gain into the effective volume', async () => {
    await setupPlayer();
    // Start a queue with a gain-0.5 track, then raise the user volume.
    await setQueue(
      [{ mediaId: 't0', url: 'u', playlistIndex: 0, gain: 0.5 }],
      0,
      false,
      0.8,
    );
    await setVolumeAsync(1);
    expect(mockTrackPlayer.getVolume()).toBeCloseTo(0.5);
    // Volume slider max 1 → effective capped at 1×gain.
  });

  it('MediaItemTransition applies the new track gain and clamps effective volume', async () => {
    await setupPlayer();
    // Gain 2 boosts above 1; clamped to 1 so it can't push past full scale.
    fireTrackPlayerEvent(TrackPlayerEvent.MediaItemTransition, {
      item: { extras: { playlistIndex: 0, gain: 2 } },
      index: 0,
    });
    expect(mockTrackPlayer.getVolume()).toBe(1);
  });

  it('MediaItemTransition applies a quiet track gain without clamping', async () => {
    await setupPlayer();
    await setVolumeAsync(0.8);
    fireTrackPlayerEvent(TrackPlayerEvent.MediaItemTransition, {
      item: { extras: { playlistIndex: 0, gain: 0.5 } },
      index: 0,
    });
    expect(mockTrackPlayer.getVolume()).toBeCloseTo(0.4);
  });

  it('MediaItemTransition ignores missing gain (defaults to no adjustment)', async () => {
    await setupPlayer();
    await setVolumeAsync(0.8);
    fireTrackPlayerEvent(TrackPlayerEvent.MediaItemTransition, {
      item: { extras: { playlistIndex: 0 } },
      index: 0,
    });
    expect(mockTrackPlayer.getVolume()).toBeCloseTo(0.8);
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

  it('reloadActiveItem replaces the active queue item and keeps track mediaId', async () => {
    await setQueue(tracks(1), 0, false, 0.8);
    await reloadActiveItem('http://example.com/reloaded', true, 0.5, undefined, 0, 't0');
    expect(mockTrackPlayer.replaceMediaItem).toHaveBeenCalledWith(
      0,
      expect.objectContaining({
        url: 'http://example.com/reloaded',
        mediaId: 't0',
      }),
    );
    expect(mockTrackPlayer.play).toHaveBeenCalled();
  });

  it('reloadActiveItem progress updates use the preserved mediaId', async () => {
    const onStatus = vi.fn();
    setOnStatus(onStatus);
    await setQueue(tracks(1), 0, false, 0.8);
    await reloadActiveItem('http://example.com/reloaded', false, 0.8, undefined, 0, 't0');
    onStatus.mockClear();

    fireTrackPlayerEvent(TrackPlayerEvent.PlaybackProgressUpdated, {
      mediaId: 't0',
      position: 12,
      duration: 200,
    });

    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ positionMillis: 12000 }),
    );
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
