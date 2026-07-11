import '@testing-library/jest-dom/vitest';
import { _resetForTests } from '@/features/player/utils/AudioManager';

// expo-modules-core reads __DEV__ at import time
(globalThis as any).__DEV__ = true;

const { mockTrackPlayer, Event, PlaybackState, PlayerCommand } = vi.hoisted(() => {
  let _playing = false;
  let _volume = 0.8;
  let _position = 0;
  let _duration = 200;
  let _buffering = false;
  let _loaded = false;
  const listeners: Record<string, Function[]> = {};

  function fire(event: string, data?: unknown) {
    (listeners[event] || []).forEach((cb) => cb(data));
  }

  const Event = {
    PlaybackProgressUpdated: 'event.playback-progress-updated',
    IsPlayingChanged: 'event.is-playing-changed',
    PlaybackStateChanged: 'event.playback-state-changed',
    RemotePlay: 'event.remote-play',
    RemotePause: 'event.remote-pause',
    RemoteNext: 'event.remote-next',
    RemotePrevious: 'event.remote-previous',
    RemoteSeek: 'event.remote-seek',
  };

  const PlaybackState = {
    Idle: 'idle',
    Ready: 'ready',
    Buffering: 'buffering',
    Ended: 'ended',
    Error: 'error',
  };

  const PlayerCommand = {
    Seek: 'seek',
    PlayPause: 'playPause',
    Next: 'next',
    Previous: 'previous',
    Stop: 'stop',
    SkipForward: 'skipForward',
    SkipBackward: 'skipBackward',
  };

  function emitStatus() {
    fire(Event.PlaybackProgressUpdated, {
      position: _position,
      duration: _duration,
    });
    fire(Event.IsPlayingChanged, { playing: _playing });
  }

  function resetState() {
    _playing = false;
    _volume = 0.8;
    _position = 0;
    _duration = 200;
    _buffering = false;
    _loaded = false;
    Object.keys(listeners).forEach((k) => { listeners[k] = []; });
  }

  const mockTrackPlayer = {
    setupPlayer: vi.fn(),
    registerBackgroundEventHandler: vi.fn(),
    setCommands: vi.fn(),
    addEventListener: vi.fn((event: string, cb: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      return { remove: () => { listeners[event] = listeners[event].filter((l) => l !== cb); } };
    }),
    play: vi.fn(() => { _playing = true; _buffering = false; emitStatus(); }),
    pause: vi.fn(() => { _playing = false; emitStatus(); }),
    stop: vi.fn(),
    seekTo: vi.fn((seconds: number) => { _position = seconds; emitStatus(); }),
    setVolume: vi.fn((v: number) => { _volume = v; }),
    setMediaItems: vi.fn(() => { _loaded = true; _position = 0; emitStatus(); }),
    setMediaItem: vi.fn(() => { _loaded = true; _position = 0; emitStatus(); }),
    clear: vi.fn(() => { _loaded = false; _playing = false; _position = 0; }),
    destroy: vi.fn(),
    getProgress: vi.fn(() => ({ position: _position, duration: _duration, buffered: _position, cached: 0 })),
    getPlaybackState: vi.fn(() => (_buffering ? PlaybackState.Buffering : _loaded ? PlaybackState.Ready : PlaybackState.Idle)),
    isPlaying: vi.fn(() => _playing),
    getVolume: vi.fn(() => _volume),
    getActiveMediaItem: vi.fn(() => null),
    getActiveMediaItemIndex: vi.fn(() => (_loaded ? 0 : null)),
    getQueue: vi.fn(() => []),
    _reset: resetState,
  };

  return { mockTrackPlayer, Event, PlaybackState, PlayerCommand };
});

beforeEach(() => {
  mockTrackPlayer._reset();
  _resetForTests();
  vi.clearAllMocks();
});

vi.mock('@rntp/player', () => ({
  __esModule: true,
  default: mockTrackPlayer,
  Event,
  PlaybackState,
  PlayerCommand,
}));

// expo-secure-store uses native modules unavailable in test env
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
}));

// lucide-react-native ships raw ESM with typeof guards that happy-dom can't
// parse. Mock it so components importing icons don't crash at import time.
vi.mock('lucide-react-native', () => ({
  Heart: 'Heart',
  Plus: 'Plus',
  MoreVertical: 'MoreVertical',
  Shuffle: 'Shuffle',
  Repeat: 'Repeat',
  Repeat1: 'Repeat1',
}));

export { mockTrackPlayer };
