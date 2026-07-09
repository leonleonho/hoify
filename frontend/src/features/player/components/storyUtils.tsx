import React from 'react';
import { PlayerContext, PlayerContextValue } from './PlayerProvider';
import type { PlayerState } from '../types/player';

/** Wrap a story in PlayerContext with the given initial state.
 *  Actions are no-ops — stories are read-only presentations. */
export function withPlayerContext(state: PlayerState) {
  const value: PlayerContextValue = {
    ...state,
    load: async () => {},
    play: async () => {},
    playPlaylist: async () => {},
    pause: async () => {},
    resume: async () => {},
    togglePlayPause: async () => {},
    next: async () => {},
    playNext: () => {},
    previous: async () => {},
    seek: async () => {},
    setVolume: async () => {},
    setQuality: async () => {},
    openFullPlayer: () => {},
    closeFullPlayer: () => {},
    toggleRepeat: () => {},
    toggleShuffle: () => {},
    isFullPlayerOpen: false,
  };
  return (Story: React.ComponentType) => (
    <PlayerContext.Provider value={value}>
      <Story />
    </PlayerContext.Provider>
  );
}
