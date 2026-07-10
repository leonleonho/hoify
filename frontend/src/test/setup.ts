import '@testing-library/jest-dom/vitest';

// expo-modules-core reads __DEV__ at import time
(globalThis as any).__DEV__ = true;

// Prevent expo-av import from crashing in tests that load PlayerProvider
// indirectly (MiniPlayer, FullPlayer, FullPlayerOverlay).
// Must be a constructor since AudioManager calls `new Audio.Sound()`.
const mockSoundInstance = {
  loadAsync: vi.fn().mockResolvedValue({}),
  unloadAsync: vi.fn().mockResolvedValue(undefined),
  playAsync: vi.fn().mockResolvedValue(undefined),
  pauseAsync: vi.fn().mockResolvedValue(undefined),
  setPositionAsync: vi.fn().mockResolvedValue(undefined),
  setVolumeAsync: vi.fn().mockResolvedValue(undefined),
  setOnPlaybackStatusUpdate: vi.fn(),
  getStatusAsync: vi.fn().mockResolvedValue({ isLoaded: false }),
  setStatusAsync: vi.fn().mockResolvedValue({}),
};
vi.mock('expo-av', () => ({
  Audio: {
    Sound: class {
      loadAsync = vi.fn().mockResolvedValue({});
      unloadAsync = vi.fn().mockResolvedValue(undefined);
      playAsync = vi.fn().mockResolvedValue(undefined);
      pauseAsync = vi.fn().mockResolvedValue(undefined);
      setPositionAsync = vi.fn().mockResolvedValue(undefined);
      setVolumeAsync = vi.fn().mockResolvedValue(undefined);
      setOnPlaybackStatusUpdate = vi.fn();
      getStatusAsync = vi.fn().mockResolvedValue({ isLoaded: false });
      setStatusAsync = vi.fn().mockResolvedValue({});
    },
    setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
  },
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
