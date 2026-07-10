import '@testing-library/jest-dom/vitest';

// expo-modules-core reads __DEV__ at import time
(globalThis as any).__DEV__ = true;

// Prevent expo-audio import from crashing in tests that load PlayerProvider
// indirectly (MiniPlayer, FullPlayer, FullPlayerOverlay).
let mockPlayers: any[] = [];
beforeEach(() => { mockPlayers = []; });

function makeMockPlayer() {
  const listeners: Record<string, Function[]> = {};
  const player = {
    id: 'mock-player',
    playing: false,
    muted: false,
    loop: false,
    paused: false,
    isLoaded: true,
    isBuffering: false,
    currentTime: 0,
    duration: 200,
    volume: 0.8,
    playbackRate: 1,
    shouldCorrectPitch: false,
    isAudioSamplingSupported: false,
    play: vi.fn(function () {
      player.playing = true;
      player.paused = false;
      fire('playbackStatusUpdate', buildStatus());
    }),
    pause: vi.fn(function () {
      player.playing = false;
      player.paused = true;
      fire('playbackStatusUpdate', buildStatus());
    }),
    replace: vi.fn(function (_source: any) {
      player.currentTime = 0;
      player.isLoaded = true;
      fire('playbackStatusUpdate', buildStatus());
    }),
    seekTo: vi.fn(function (seconds: number) {
      player.currentTime = seconds;
      fire('playbackStatusUpdate', buildStatus());
      return Promise.resolve();
    }),
    remove: vi.fn(function () {
      Object.keys(listeners).forEach((e) => { listeners[e] = []; });
    }),
    addListener: vi.fn(function (event: string, cb: Function) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      return { remove: () => { listeners[event] = listeners[event].filter((l: Function) => l !== cb); } };
    }),
    removeListener: vi.fn(),
    setAudioSamplingEnabled: vi.fn(),
    setActiveForLockScreen: vi.fn(),
    updateLockScreenMetadata: vi.fn(),
    clearLockScreenControls: vi.fn(),
    setPlaybackRate: vi.fn(),
  };
  mockPlayers.push(player);

  function fire(event: string, data?: any) {
    (listeners[event] || []).forEach((cb: Function) => cb(data));
  }

  function buildStatus() {
    return {
      id: player.id,
      currentTime: player.currentTime,
      duration: player.duration,
      playing: player.playing,
      paused: player.paused,
      isLoaded: player.isLoaded,
      isBuffering: player.isBuffering,
      loop: player.loop,
      didJustFinish: false,
      mute: false,
      playbackState: player.playing ? 'playing' : 'paused',
      timeControlStatus: player.playing ? 'playing' : 'paused',
      reasonForWaitingToPlay: '',
      playbackRate: 1,
      shouldCorrectPitch: false,
    };
  }

  return player;
}

vi.mock('expo-audio', () => ({
  createAudioPlayer: vi.fn(() => makeMockPlayer()),
  setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
  setIsAudioActiveAsync: vi.fn().mockResolvedValue(undefined),
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
