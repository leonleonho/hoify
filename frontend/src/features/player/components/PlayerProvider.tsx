import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import type { Track } from '@/hooks/generated/types';
import type { PlayerState } from '../types/player';

const STREAM_BASE = 'http://localhost:4000/stream';
const SEEK_THRESHOLD_MS = 3000;

function buildStreamUrl(trackId: string): string {
  return `${STREAM_BASE}/${encodeURIComponent(trackId)}`;
}

// ── state ───────────────────────────────────────────────────────────────────

export function initialState(volume = 0.8): PlayerState {
  return {
    currentTrack: null, playlist: [],
    isPlaying: false, isLoading: false,
    position: 0, duration: 0, volume,
  };
}

export function reducer(state: PlayerState, action: any): PlayerState {
  switch (action.type) {
    case 'PATCH':
      return { ...state, ...action.patch };
    case 'STATUS': {
      const s = action.status;
      return { ...state, isPlaying: s.isPlaying, isLoading: s.isBuffering, position: s.positionMillis, duration: s.durationMillis ?? 0, volume: s.volume ?? state.volume };
    }
    case 'LOAD_TRACK':
      return { ...state, currentTrack: action.track, playlist: action.playlist ?? state.playlist, isPlaying: false, isLoading: false, position: 0, duration: 0 };
    default:
      return state;
  }
}

// ── context ─────────────────────────────────────────────────────────────────

export interface PlayerActions {
  load: (track: Track) => Promise<void>;
  play: (track: Track) => Promise<void>;
  playPlaylist: (tracks: Track[], startIndex?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => Promise<void>;
  playNext: (track: Track) => void;
  previous: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (value: number) => Promise<void>;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  isFullPlayerOpen: boolean;
}

export type PlayerContextValue = PlayerState & PlayerActions;

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function useMusicPlayer(): PlayerContextValue {
  const v = useContext(PlayerContext);
  if (!v) throw new Error('useMusicPlayer requires PlayerProvider');
  return v;
}

// ── provider ────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [s, dispatch] = useReducer(reducer, initialState());
  const [isFullPlayerOpen, setFullPlayerOpen] = React.useState(false);
  const sound = useRef<Audio.Sound | null>(null);
  const idx = useRef(-1);
  const ready = useRef(false);

  // Refs that always hold latest value, so callbacks don't go stale
  const stateRef = useRef(s);
  stateRef.current = s;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    return () => { sound.current?.unloadAsync().catch(() => {}); };
  }, []);

  // Stable status callback — reads state via refs
  const handleStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false } });
      return;
    }
    if (status.didJustFinish && !status.isLooping) {
      const pl = stateRef.current.playlist;
      if (pl.length <= 1) {
        dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false, position: 0 } });
      } else {
        const nextIdx = (idx.current + 1) % pl.length;
        // fire-and-forget — callback context, not awaited
        idx.current = nextIdx;
        dispatchRef.current({ type: 'LOAD_TRACK', track: pl[nextIdx] });
        // reload the new track async
        const url = buildStreamUrl(pl[nextIdx].id);
        Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, volume: stateRef.current.volume },
          handleStatus,
        ).then(({ sound: snd }) => {
          sound.current?.unloadAsync().catch(() => {});
          sound.current = snd;
        }).catch(() => {
          dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false } });
        });
      }
      return;
    }
    dispatchRef.current({ type: 'STATUS', status });
  }, []);

  const ensure = useCallback(async () => {
    if (ready.current) return;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false, playsInSilentModeIOS: true,
      staysActiveInBackground: true, shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    ready.current = true;
  }, []);

  const loadSound = useCallback(async (track: Track, autoPlay: boolean) => {
    await ensure();
    try { await sound.current?.unloadAsync(); } catch {}
    const url = buildStreamUrl(track.id);
    const { sound: snd } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: autoPlay, volume: stateRef.current.volume },
      handleStatus,
    );
    sound.current = snd;
  }, [ensure, handleStatus]);

  // ---- actions (all read state via stateRef, write via dispatch) -----------

  const load = useCallback(async (track: Track) => {
    dispatch({ type: 'LOAD_TRACK', track, playlist: [track] });
    idx.current = 0;
    try { await loadSound(track, false); } catch {}
  }, [loadSound]);

  const play = useCallback(async (track: Track) => {
    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await loadSound(track, true);
    dispatch({ type: 'LOAD_TRACK', track, playlist: [track] });
    idx.current = 0;
  }, [loadSound]);

  const playPlaylist = useCallback(async (tracks: Track[], start = 0) => {
    if (!tracks.length) return;
    const i = Math.max(0, Math.min(start, tracks.length - 1));
    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await loadSound(tracks[i], true);
    dispatch({ type: 'LOAD_TRACK', track: tracks[i], playlist: tracks });
    idx.current = i;
  }, [loadSound]);

  const pause = useCallback(async () => {
    await sound.current?.pauseAsync();
    dispatch({ type: 'PATCH', patch: { isPlaying: false } });
  }, []);

  const resume = useCallback(async () => {
    await sound.current?.playAsync();
    dispatch({ type: 'PATCH', patch: { isPlaying: true } });
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (stateRef.current.isPlaying) await pause(); else await resume();
  }, [pause, resume]);

  const playNext = useCallback((track: Track) => {
    const pl = stateRef.current.playlist;
    if (!pl.length) return;
    const insertAt = idx.current + 1;
    const updated = [...pl.slice(0, insertAt), track, ...pl.slice(insertAt)];
    dispatch({ type: 'LOAD_TRACK', track: pl[idx.current], playlist: updated });
  }, []);

  const next = useCallback(async () => {
    const pl = stateRef.current.playlist;
    if (!pl.length) return;
    const i = (idx.current + 1) % pl.length;
    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await loadSound(pl[i], true);
    dispatch({ type: 'LOAD_TRACK', track: pl[i], playlist: pl });
    idx.current = i;
  }, [loadSound]);

  const previous = useCallback(async () => {
    const { playlist, position } = stateRef.current;
    if (!playlist.length) return;
    if (position > SEEK_THRESHOLD_MS) {
      await sound.current?.setPositionAsync(0);
      dispatch({ type: 'PATCH', patch: { position: 0 } });
      return;
    }
    const i = idx.current <= 0 ? playlist.length - 1 : idx.current - 1;
    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await loadSound(playlist[i], true);
    dispatch({ type: 'LOAD_TRACK', track: playlist[i] });
    idx.current = i;
  }, [loadSound]);

  const seek = useCallback(async (ms: number) => {
    await sound.current?.setPositionAsync(ms);
    dispatch({ type: 'PATCH', patch: { position: ms } });
  }, []);

  const setVolume = useCallback(async (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    await sound.current?.setVolumeAsync(c);
    dispatch({ type: 'PATCH', patch: { volume: c } });
  }, []);

  const openFullPlayer = useCallback(() => setFullPlayerOpen(true), []);
  const closeFullPlayer = useCallback(() => setFullPlayerOpen(false), []);

  const value: PlayerContextValue = {
    ...s,
    load, play, playPlaylist, pause, resume,
    togglePlayPause, next, playNext, previous, seek, setVolume,
    openFullPlayer, closeFullPlayer, isFullPlayerOpen,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
