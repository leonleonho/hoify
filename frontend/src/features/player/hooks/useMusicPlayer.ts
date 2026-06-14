import { useEffect, useReducer, useCallback } from 'react';
import { musicPlayer } from '../services/MusicPlayerService';
import type { PlayerState } from '../types/player';

/**
 * React hook that subscribes to the singleton MusicPlayerService.
 * Components re-render whenever player state changes.
 *
 * Returns the player state snapshot plus all bound action methods.
 */
export function useMusicPlayer() {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const unsub = musicPlayer.subscribe(() => forceUpdate());
    return unsub;
  }, []);

  /** Read current state snapshot (reactive via subscription) */
  const state: PlayerState = musicPlayer.state;

  const play = useCallback(
    (...args: Parameters<(typeof musicPlayer)['play']>) => musicPlayer.play(...args),
    [],
  );
  const playPlaylist = useCallback(
    (...args: Parameters<(typeof musicPlayer)['playPlaylist']>) =>
      musicPlayer.playPlaylist(...args),
    [],
  );
  const pause = useCallback(() => musicPlayer.pause(), []);
  const resume = useCallback(() => musicPlayer.resume(), []);
  const togglePlayPause = useCallback(() => musicPlayer.togglePlayPause(), []);
  const next = useCallback(() => musicPlayer.next(), []);
  const previous = useCallback(() => musicPlayer.previous(), []);
  const seek = useCallback(
    (posMs: number) => musicPlayer.seek(posMs),
    [],
  );
  const setVolume = useCallback(
    (value: number) => musicPlayer.setVolume(value),
    [],
  );

  return {
    state,
    play,
    playPlaylist,
    pause,
    resume,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
  };
}
