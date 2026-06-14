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

// ── expo-av mock ─────────────────────────────────────────────────────────────
// Overrides the setup.ts mock so tests can inspect calls.

const { mockSound, mockSetAudioMode, mockCreateAsync } = vi.hoisted(() => {
  const sound = {
    playAsync: vi.fn(),
    pauseAsync: vi.fn(),
    setPositionAsync: vi.fn(),
    setVolumeAsync: vi.fn(),
    unloadAsync: vi.fn().mockResolvedValue(undefined),
  };
  return {
    mockSound: sound,
    mockSetAudioMode: vi.fn(),
    mockCreateAsync: vi.fn().mockResolvedValue({ sound }),
  };
});

vi.mock('expo-av', () => ({
  Audio: {
    Sound: { createAsync: (...args: any[]) => mockCreateAsync(...args) },
    setAudioModeAsync: (...args: any[]) => mockSetAudioMode(...args),
  },
}));

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
    expect(s.duration).toBe(200000);
    expect(s.volume).toBe(0.5); // volume from STATUS payload
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
    expect(s.duration).toBe(0);
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
    expect(mockCreateAsync).toHaveBeenCalled();
    expect(mockSound.playAsync).not.toHaveBeenCalled();
  });

  it('play loads sound', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.play(mockTrack1);
    });
    expect(mockSetAudioMode).toHaveBeenCalled();
    expect(mockCreateAsync).toHaveBeenCalled();
  });

  it('pause pauses audio', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.pause();
    });
    expect(mockSound.pauseAsync).toHaveBeenCalled();
  });

  it('resume resumes audio', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.resume();
    });
    expect(mockSound.playAsync).toHaveBeenCalled();
  });

  it('togglePlayPause resumes when paused', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.togglePlayPause();
    });
    expect(mockSound.playAsync).toHaveBeenCalled();
  });

  it('playPlaylist fetches sound at given index', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.playPlaylist([mockTrack1, mockTrack2], 1);
    });
    expect(mockCreateAsync).toHaveBeenCalled();
  });

  it('playPlaylist with empty playlist does nothing', async () => {
    const cap = renderProvider();
    const before = mockCreateAsync.mock.calls.length;
    await act(async () => {
      await cap.current.playPlaylist([]);
    });
    expect(mockCreateAsync).toHaveBeenCalledTimes(before);
  });

  it('next advances playlist', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.playPlaylist([mockTrack1, mockTrack2], 0);
    });
    expect(mockCreateAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      await cap.current.next();
    });
    expect(mockCreateAsync).toHaveBeenCalledTimes(2);
  });

  it('previous wraps to last track at index 0', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.playPlaylist([mockTrack1, mockTrack2], 0);
    });
    expect(mockCreateAsync).toHaveBeenCalledTimes(1);

    await act(async () => {
      await cap.current.previous();
    });
    expect(mockCreateAsync).toHaveBeenCalledTimes(2);
  });

  it('seek calls setPositionAsync', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.seek(30000);
    });
    expect(mockSound.setPositionAsync).toHaveBeenCalledWith(30000);
  });

  it('setVolume clamps above 1', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.setVolume(1.5);
    });
    expect(mockSound.setVolumeAsync).toHaveBeenCalledWith(1);
  });

  it('setVolume clamps below 0', async () => {
    const cap = renderProvider();
    await act(async () => {
      await cap.current.load(mockTrack1);
      await cap.current.setVolume(-0.5);
    });
    expect(mockSound.setVolumeAsync).toHaveBeenCalledWith(0);
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
});
