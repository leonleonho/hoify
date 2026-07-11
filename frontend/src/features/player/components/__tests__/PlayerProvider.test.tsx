import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import {
  PlayerProvider,
  reducer,
  initialState,
  useMusicPlayer,
  type PlayerContextValue,
} from '../PlayerProvider';
import { mockTrack1, mockTrack2 } from './utils';
import { mockTrackPlayer } from '@/test/setup';

// ── test helpers ─────────────────────────────────────────────────────────────

function ContextCapture({
  captured,
}: {
  captured: { current: PlayerContextValue | null };
}) {
  captured.current = useMusicPlayer();
  return null;
}

function renderProvider() {
  const captured: { current: PlayerContextValue | null } = { current: null };
  render(
    <PlayerProvider>
      <ContextCapture captured={captured} />
    </PlayerProvider>,
  );
  /* assert: captured.current is set during render */
  return captured as { current: PlayerContextValue };
}

// ── reducer unit tests ─────────────────────────────────────────────────────

describe('reducer', () => {
  it('PATCH merges partial state', () => {
    const s = reducer(initialState(), {
      type: 'PATCH',
      patch: { isPlaying: true },
    });
    expect(s.isPlaying).toBe(true);
    expect(s.volume).toBe(0.8);
  });

  it('STATUS updates playback fields', () => {
    const s = reducer(initialState(), {
      type: 'STATUS',
      status: {
        isPlaying: true,
        isBuffering: false,
        positionMillis: 5000,
        durationMillis: 200000,
        volume: 0.5,
      },
    });
    expect(s.isPlaying).toBe(true);
    expect(s.isLoading).toBe(false);
    expect(s.position).toBe(5000);
    // STATUS no longer sets duration — LOAD_TRACK sets it from track.duration
    expect(s.duration).toBe(0);
    expect(s.volume).toBe(0.8); // STATUS no longer carries volume
  });

  it('STATUS marks isBuffering as isLoading', () => {
    const s = reducer(initialState(), {
      type: 'STATUS',
      status: {
        isPlaying: false,
        isBuffering: true,
        positionMillis: 0,
        durationMillis: 0,
        volume: 0.8,
      },
    });
    expect(s.isLoading).toBe(true);
  });

  it('LOAD_TRACK sets track, resets position, clears playing', () => {
    const base = { ...initialState(), isPlaying: true, position: 50000, duration: 200000 };
    const s = reducer(base, { type: 'LOAD_TRACK', track: mockTrack1 });
    expect(s.currentTrack?.id).toBe('track-1');
    expect(s.position).toBe(0);
    // track.duration from GraphQL is seconds; converted to ms
    expect(s.duration).toBe((mockTrack1.duration ?? 0) * 1000);
    expect(s.isPlaying).toBe(false);
    expect(s.isLoading).toBe(false);
  });

  it('LOAD_TRACK stores playlist when provided', () => {
    const s = reducer(initialState(), {
      type: 'LOAD_TRACK',
      track: mockTrack1,
      playlist: [mockTrack1, mockTrack2],
    });
    expect(s.playlist).toHaveLength(2);
  });

  it('default returns state unchanged', () => {
    const s = { ...initialState(), isPlaying: true };
    expect(reducer(s, { type: 'UNKNOWN' })).toBe(s);
  });
});

// ── provider integration tests ─────────────────────────────────────────────

describe('PlayerProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('provides initial state', () => {
    const cap = renderProvider();
    expect(cap.current.currentTrack).toBeNull();
    expect(cap.current.isPlaying).toBe(false);
    expect(cap.current.isLoading).toBe(false);
    expect(cap.current.volume).toBe(0.8);
  });

  it('load sets currentTrack, does not auto-play', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
    });
    expect(mockTrackPlayer.setMediaItems).toHaveBeenCalled();
    expect(mockTrackPlayer.play).not.toHaveBeenCalled();
  });

  it('play loads sound', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.play(mockTrack1);
    });
    expect(mockTrackPlayer.setupPlayer).toHaveBeenCalled();
    expect(mockTrackPlayer.setMediaItems).toHaveBeenCalled();
  });

  it('pause pauses audio', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.pause();
    });
    expect(mockTrackPlayer.pause).toHaveBeenCalled();
  });

  it('resume resumes audio', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.resume();
    });
    expect(mockTrackPlayer.play).toHaveBeenCalled();
  });

  it('togglePlayPause resumes when paused', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.togglePlayPause();
    });
    expect(mockTrackPlayer.play).toHaveBeenCalled();
  });

  it('playPlaylist fetches sound at given index', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.playPlaylist([mockTrack1, mockTrack2], 1);
    });
    expect(mockTrackPlayer.setMediaItems).toHaveBeenCalled();
  });

  it('playPlaylist with empty playlist does nothing', async () => {
    const cap = renderProvider();
    const before = mockTrackPlayer.setMediaItems.mock.calls.length;
    await act(async () => {
      await cap.current.playPlaylist([]);
    });
    expect(mockTrackPlayer.setMediaItems).toHaveBeenCalledTimes(before);
  });

  it('next advances playlist via native queue skip', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.playPlaylist([mockTrack1, mockTrack2], 0);
    });
    expect(mockTrackPlayer.setMediaItems).toHaveBeenCalledTimes(1);

    await act(async () => {
      await cap.current.next();
    });
    expect(mockTrackPlayer.skipToNext).toHaveBeenCalledTimes(1);
    expect(cap.current.currentTrack?.id).toBe('track-2');
  });

  it('previous wraps to last track at index 0', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.playPlaylist([mockTrack1, mockTrack2], 0);
    });
    expect(mockTrackPlayer.setMediaItems).toHaveBeenCalledTimes(1);

    await act(async () => {
      await cap.current.previous();
    });
    expect(mockTrackPlayer.setMediaItems).toHaveBeenCalledTimes(2);
    expect(cap.current.currentTrack?.id).toBe('track-2');
  });

  it('seek calls seekTo', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.seek(30000);
    });
    expect(mockTrackPlayer.seekTo).toHaveBeenCalledWith(30);
  });

  it('setVolume clamps above 1', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.setVolume(1.5);
    });
    expect(mockTrackPlayer.setVolume).toHaveBeenCalledWith(1);
  });

  it('setVolume clamps below 0', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.setVolume(-0.5);
    });
    expect(mockTrackPlayer.setVolume).toHaveBeenCalledWith(0);
  });

  it('openFullPlayer sets isFullPlayerOpen to true', () => {
    const cap = renderProvider();
    expect(cap.current.isFullPlayerOpen).toBe(false);
    act(() => {
      cap.current.openFullPlayer();
    });
    expect(cap.current.isFullPlayerOpen).toBe(true);
  });

  it('closeFullPlayer sets isFullPlayerOpen to false', () => {
    const cap = renderProvider();
    act(() => {
      cap.current.openFullPlayer();
    });
    expect(cap.current.isFullPlayerOpen).toBe(true);
    act(() => {
      cap.current.closeFullPlayer();
    });
    expect(cap.current.isFullPlayerOpen).toBe(false);
  });

  it('useMusicPlayer throws outside PlayerProvider', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    function BadChild() {
      useMusicPlayer();
      return null;
    }
    expect(() => render(<BadChild />)).toThrow(
      'useMusicPlayer requires PlayerProvider',
    );
    err.mockRestore();
  });

  // ── repeat / shuffle tests ─────────────────────────────────────────────

  it('toggleRepeat cycles off → all → one → off', () => {
    const cap = renderProvider();
    expect(cap.current.repeatMode).toBe('off');

    act(() => cap.current.toggleRepeat());
    expect(cap.current.repeatMode).toBe('all');

    act(() => cap.current.toggleRepeat());
    expect(cap.current.repeatMode).toBe('one');

    act(() => cap.current.toggleRepeat());
    expect(cap.current.repeatMode).toBe('off');
  });

  it('toggleShuffle toggles shuffle boolean', () => {
    const cap = renderProvider();
    expect(cap.current.shuffle).toBe(false);

    act(() => cap.current.toggleShuffle());
    expect(cap.current.shuffle).toBe(true);

    act(() => cap.current.toggleShuffle());
    expect(cap.current.shuffle).toBe(false);
  });

  it('repeat-one next replays same track', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.playPlaylist([mockTrack1, mockTrack2], 0);
    });

    act(() => cap.current.toggleRepeat());
    act(() => cap.current.toggleRepeat()); // off → all → one
    expect(cap.current.repeatMode).toBe('one');

    await act(async () => {
      await cap.current.next();
    });
    expect(mockTrackPlayer.replaceMediaItem).toHaveBeenCalled();
  });

  it('repeat-off next at end stops playback', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.playPlaylist([mockTrack1, mockTrack2], 1);
    });
    expect(cap.current.isPlaying).toBe(false); // LOAD_TRACK sets isPlaying false

    // next at last track with repeat off should stop
    await act(async () => {
      await cap.current.next();
    });
    expect(cap.current.isPlaying).toBe(false);
  });

  it('previous with repeat-one seeks to position 0', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.playPlaylist([mockTrack1, mockTrack2], 0);
    });

    act(() => cap.current.toggleRepeat());
    act(() => cap.current.toggleRepeat()); // off → all → one

    await act(async () => {
      await cap.current.previous();
    });
    // With repeat-one, previous should call seekTo(0)
    expect(mockTrackPlayer.seekTo).toHaveBeenCalledWith(0);
  });
});
