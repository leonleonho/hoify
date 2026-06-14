// Mock for expo-av in Storybook/web environment.
// Prevents native audio modules from being pulled into the Storybook bundle.

const noop = () => {};

// Reproduce the subset of AVPlaybackStatus that our service checks
export interface AVPlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  durationMillis?: number;
  positionMillis: number;
  volume: number;
  didJustFinish: boolean;
  isLooping: boolean;
}

function makeMockSound(onStatusUpdate?: (status: AVPlaybackStatus) => void) {
  let status: AVPlaybackStatus = {
    isLoaded: true,
    isPlaying: false,
    isBuffering: false,
    durationMillis: 200_000,
    positionMillis: 0,
    volume: 0.8,
    didJustFinish: false,
    isLooping: false,
  };

  const fire = (patch: Partial<AVPlaybackStatus>) => {
    status = { ...status, ...patch };
    onStatusUpdate?.(status);
  };

  return {
    playAsync: () => Promise.resolve(fire({ isPlaying: true })),
    pauseAsync: () => Promise.resolve(fire({ isPlaying: false })),
    stopAsync: () => Promise.resolve(fire({ isPlaying: false, positionMillis: 0 })),
    unloadAsync: () => Promise.resolve(),
    setPositionAsync: (posMs: number) =>
      Promise.resolve(fire({ positionMillis: posMs })),
    setVolumeAsync: (vol: number) => Promise.resolve(fire({ volume: vol })),
    setOnPlaybackStatusUpdate: (cb: (s: AVPlaybackStatus) => void) => {
      onStatusUpdate = cb;
    },
    getStatusAsync: () => Promise.resolve(status),
    // Expose for story seeding
    _getStatus: () => status,
    _setStatus: (s: Partial<AVPlaybackStatus>) => fire(s),
  };
}

export const Audio = {
  setAudioModeAsync: () => Promise.resolve(),
  Sound: {
    createAsync: (
      _source: object,
      initialStatus?: { shouldPlay?: boolean; volume?: number },
      onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void,
    ) => {
      const sound = makeMockSound(onPlaybackStatusUpdate);
      if (initialStatus?.shouldPlay) {
        sound.playAsync();
      }
      return Promise.resolve({
        sound,
        status: sound._getStatus(),
      });
    },
  },
};
