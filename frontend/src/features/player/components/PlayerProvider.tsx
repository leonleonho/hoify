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
import type { PlayerQuality, PlayerState, RepeatMode } from '../types/player';
import { getItem, setItem } from '@/utils/storage';
import { API_BASE } from '@/constants/api';
import { useMediaSession } from '../hooks/useMediaSession';

const STREAM_BASE = `${API_BASE}/stream`;
const SEEK_THRESHOLD_MS = 3000;

function buildStreamUrl(trackId: string, quality: PlayerQuality, seek?: number): string {
  let url = `${STREAM_BASE}/${encodeURIComponent(trackId)}?quality=${quality}`;
  if (seek && quality !== 'original') {
    url += `&seek=${Math.floor(seek / 1000)}`;
  }
  return url;
}

/** Picks random playlist index different from current. Returns current if only one track. */
function getRandomIndex(current: number, length: number): number {
  if (length <= 1) return current;
  let next: number;
  do { next = Math.floor(Math.random() * length); } while (next === current);
  return next;
}

// ── state ───────────────────────────────────────────────────────────────────

export function initialState(volume = 0.8): PlayerState {
  return {
    currentTrack: null, playlist: [],
    isPlaying: false, isLoading: false,
    position: 0, duration: 0, volume,
    quality: 'original', repeatMode: 'off', shuffle: false,
  };
}

export function reducer(state: PlayerState, action: any): PlayerState {
  switch (action.type) {
    case 'PATCH':
      return { ...state, ...action.patch };
    case 'STATUS': {
      const s = action.status;
      const offset = action.seekOffset ?? 0;
      return { ...state, isPlaying: s.isPlaying, isLoading: s.isBuffering, position: s.positionMillis + offset, volume: s.volume ?? state.volume };    }
    case 'LOAD_TRACK':
      // track.duration from GraphQL is seconds; convert to ms
      const d = action.track?.duration ?? 0;
      return { ...state, currentTrack: action.track, playlist: action.playlist ?? state.playlist, isPlaying: false, isLoading: false, position: 0, duration: d * 1000 };
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
  setQuality: (value: PlayerQuality) => Promise<void>;
  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
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
  const seekOffset = useRef(0);

  // Refs that always hold latest value, so callbacks don't go stale
  const stateRef = useRef(s);
  stateRef.current = s;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // Load persisted quality on mount
  useEffect(() => {
    getItem('player_quality').then((q) => {
      if (q === 'original' || q === 'high' || q === 'medium' || q === 'low') {
        dispatch({ type: 'PATCH', patch: { quality: q as PlayerQuality } });
      }
    }).catch(() => {});
  }, []);

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
      const s = stateRef.current;
      const pl = s.playlist;

      // Reset seek offset so the next track's STATUS doesn't apply old seek
      seekOffset.current = 0;

      // Repeat-one: replay same track
      if (s.repeatMode === 'one' && s.currentTrack) {
        const track = s.currentTrack;
        dispatchRef.current({ type: 'LOAD_TRACK', track });
        const url = buildStreamUrl(track.id, s.quality);
        Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, volume: s.volume },
          handleStatus,
        ).then(({ sound: snd }) => {
          sound.current?.unloadAsync().catch(() => {});
          sound.current = snd;
        }).catch(() => {
          dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false } });
        });
        return;
      }

      // No tracks or single track without repeat-all: stop
      if (pl.length <= 1 && s.repeatMode !== 'all') {
        dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false, position: 0 } });
        return;
      }

      let nextIdx: number;
      if (s.shuffle) {
        nextIdx = getRandomIndex(idx.current, pl.length);
      } else {
        nextIdx = (idx.current + 1) % pl.length;
      }

      // Repeat-off: stop at end of playlist
      if (s.repeatMode === 'off' && nextIdx === 0 && idx.current === pl.length - 1) {
        dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false, position: 0 } });
        return;
      }

      idx.current = nextIdx;
      dispatchRef.current({ type: 'LOAD_TRACK', track: pl[nextIdx] });
      const url = buildStreamUrl(pl[nextIdx].id, s.quality);
      Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, volume: s.volume },
        handleStatus,
      ).then(({ sound: snd }) => {
        sound.current?.unloadAsync().catch(() => {});
        sound.current = snd;
      }).catch(() => {
        dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false } });
      });
      return;
    }
    dispatchRef.current({ type: 'STATUS', status, seekOffset: seekOffset.current });
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

  const loadSound = useCallback(async (track: Track, autoPlay: boolean, seekMs?: number) => {
    await ensure();
    try { await sound.current?.unloadAsync(); } catch {}
    const q = stateRef.current.quality;
    const isTrans = q !== 'original';
    const seek = seekMs && isTrans ? seekMs : undefined;
    if (seek) {
      seekOffset.current = seek;
    } else {
      seekOffset.current = 0;
    }
    const url = buildStreamUrl(track.id, q, seek);
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
    const s = stateRef.current;
    const pl = s.playlist;
    if (!pl.length) return;

    // Repeat-one: replay same track
    if (s.repeatMode === 'one' && s.currentTrack) {
      dispatch({ type: 'PATCH', patch: { isLoading: true } });
      await loadSound(s.currentTrack, true, 0);
      dispatch({ type: 'LOAD_TRACK', track: s.currentTrack, playlist: pl });
      return;
    }

    let i: number;
    if (s.shuffle) {
      i = getRandomIndex(idx.current, pl.length);
    } else {
      i = (idx.current + 1) % pl.length;
    }

    // Repeat-off: stop at end
    if (s.repeatMode === 'off' && i === 0 && idx.current === pl.length - 1) {
      await sound.current?.setPositionAsync(0);
      dispatch({ type: 'PATCH', patch: { isPlaying: false, position: 0 } });
      idx.current = pl.length - 1;
      return;
    }

    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await loadSound(pl[i], true);
    dispatch({ type: 'LOAD_TRACK', track: pl[i], playlist: pl });
    idx.current = i;
  }, [loadSound]);

  const previous = useCallback(async () => {
    const s = stateRef.current;
    const { playlist, position } = s;
    if (!playlist.length) return;

    // Repeat-one: restart current track
    if (s.repeatMode === 'one') {
      await sound.current?.setPositionAsync(0);
      dispatch({ type: 'PATCH', patch: { position: 0 } });
      return;
    }

    if (position > SEEK_THRESHOLD_MS) {
      await sound.current?.setPositionAsync(0);
      dispatch({ type: 'PATCH', patch: { position: 0 } });
      return;
    }
    let i: number;
    if (s.shuffle) {
      i = getRandomIndex(idx.current, playlist.length);
    } else {
      i = idx.current <= 0 ? playlist.length - 1 : idx.current - 1;
    }
    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await loadSound(playlist[i], true);
    dispatch({ type: 'LOAD_TRACK', track: playlist[i] });
    idx.current = i;
  }, [loadSound]);

  const seek = useCallback(async (ms: number) => {
    const q = stateRef.current.quality;
    if (q !== 'original') {
      // For transcoded streams, seek via URL reload
      const track = stateRef.current.currentTrack;
      if (!track) return;
      dispatch({ type: 'PATCH', patch: { isLoading: true } });
      await loadSound(track, stateRef.current.isPlaying, ms);
      dispatch({ type: 'PATCH', patch: { position: ms } });
      return;
    }
    // Original quality — use native seek
    await sound.current?.setPositionAsync(ms);
    dispatch({ type: 'PATCH', patch: { position: ms } });
  }, [loadSound]);

  const setVolume = useCallback(async (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    await sound.current?.setVolumeAsync(c);
    dispatch({ type: 'PATCH', patch: { volume: c } });
  }, []);

  const setQuality = useCallback(async (q: PlayerQuality) => {
    dispatch({ type: 'PATCH', patch: { quality: q } });
    await setItem('player_quality', q);
    // Reload current track with new quality
    const track = stateRef.current.currentTrack;
    if (track) {
      const wasPlaying = stateRef.current.isPlaying;
      const pos = stateRef.current.position;
      dispatch({ type: 'PATCH', patch: { isLoading: true } });
      await loadSound(track, wasPlaying, pos);
    }
  }, [loadSound]);

  const toggleRepeat = useCallback(() => {
    const current = stateRef.current.repeatMode;
    const next: Record<RepeatMode, RepeatMode> = { off: 'all', all: 'one', one: 'off' };
    dispatch({ type: 'PATCH', patch: { repeatMode: next[current] } });
  }, []);

  const toggleShuffle = useCallback(() => {
    dispatch({ type: 'PATCH', patch: { shuffle: !stateRef.current.shuffle } });
  }, []);

  const openFullPlayer = useCallback(() => setFullPlayerOpen(true), []);
  const closeFullPlayer = useCallback(() => setFullPlayerOpen(false), []);

  // Wire browser Media Session API (lock screen / system tray controls)
  useMediaSession(s.currentTrack, s.isPlaying, {
    play: resume,
    pause: pause,
    nexttrack: next,
    previoustrack: previous,
    seekto: seek,
  });

  const value: PlayerContextValue = {
    ...s,
    load, play, playPlaylist, pause, resume,
    togglePlayPause, next, playNext, previous, seek, setVolume, setQuality,
    openFullPlayer, closeFullPlayer, toggleRepeat, toggleShuffle, isFullPlayerOpen,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
