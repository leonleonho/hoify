import '@testing-library/jest-dom/vitest';

// expo-modules-core reads __DEV__ at import time
(globalThis as any).__DEV__ = true;

// Prevent expo-av import from crashing in tests that load PlayerProvider
// indirectly (MiniPlayer, FullPlayer, FullPlayerOverlay).
// PlayerProvider tests override this mock with their own hoisted factory.
vi.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: vi.fn().mockResolvedValue({ sound: {} }),
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
}));
