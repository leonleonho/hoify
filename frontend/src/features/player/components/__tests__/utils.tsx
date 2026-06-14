import type { Track } from '@/hooks/generated';
import type { PlayerState } from '@/features/player/types/player';
import type { PlayerContextValue } from '../PlayerProvider';

export const mockTrack1: Track = {
  __typename: 'Track',
  id: 'track-1',
  title: 'Test Song One',
  filePath: 'music/test1.mp3',
  fileFormat: 'mp3',
  duration: 200000,
  discNumber: 1,
  trackNumber: 1,
  fileSize: 5000000,
  album: {
    __typename: 'Album',
    id: 'album-1',
    title: 'Test Album',
    coverUrl: null,
    artist: {
      __typename: 'Artist',
      id: 'artist-1',
      name: 'Test Artist',
      albums: [],
      bio: null,
      imageUrl: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    tracks: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    releaseYear: 2024,
  },
  genres: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

export const mockTrack2: Track = {
  __typename: 'Track',
  id: 'track-2',
  title: 'Test Song Two',
  filePath: 'music/test2.flac',
  fileFormat: 'flac',
  duration: 300000,
  discNumber: 1,
  trackNumber: 2,
  fileSize: 12000000,
  album: {
    __typename: 'Album',
    id: 'album-1',
    title: 'Test Album',
    coverUrl: null,
    artist: {
      __typename: 'Artist',
      id: 'artist-1',
      name: 'Test Artist',
      albums: [],
      bio: null,
      imageUrl: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    tracks: [],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    releaseYear: 2024,
  },
  genres: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

export function makePlayerState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    currentTrack: null,
    playlist: [],
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    volume: 0.8,
    ...overrides,
  };
}

export function makeMockContext(overrides: Partial<PlayerContextValue> = {}): PlayerContextValue {
  const state = makePlayerState();
  return {
    ...state,
    load: async () => {},
    play: async () => {},
    playPlaylist: async () => {},
    pause: async () => {},
    resume: async () => {},
    togglePlayPause: async () => {},
    next: async () => {},
    previous: async () => {},
    seek: async () => {},
    setVolume: async () => {},
    openFullPlayer: () => {},
    closeFullPlayer: () => {},
    isFullPlayerOpen: false,
    ...overrides,
  };
}
