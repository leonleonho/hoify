import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import type { Track } from '@/hooks/generated/types';
import type { PlayerQuality, PlayerState, RepeatMode } from '../types/player';
import { getItem, setItem } from '@/utils/storage';
import { getApiBase, artUrl } from '@/constants/api';
import { useMediaSession } from '../hooks/useMediaSession';
import { setRemoteCallbacks } from '../services/registerRemoteCallbacks';
import * as AudioManager from '../utils/AudioManager';
import type { PlaybackStatus } from '../utils/AudioManager';

const SEEK_THRESHOLD_MS = 3000;

function trackMetadata(track: Track): AudioManager.LockScreenMetadata {
  return {
    title: track.title,
    artist: track.trackArtist ?? track.album.artist.name,
    albumTitle: track.album.title,
    artworkUrl: track.album.coverUrl ? artUrl(track.album.coverUrl) : undefined,
  };
}

function getStreamBase(): string {
  return `${getApiBase()}/stream`;
}

function buildStreamUrl(trackId: string, quality: PlayerQuality, seek?: number): string {
  let url = `${getStreamBase()}/${encodeURIComponent(trackId)}?quality=${quality}`;
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
      return { ...state, isPlaying: s.isPlaying, isLoading: s.isBuffering, position: s.positionMillis + offset };
    }
    case 'LOAD_TRACK':
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
  // Restore state from snapshot if PlayerProvider remounted mid-playback
  const snap = AudioManager.popSnapshot();
  const initial = snap
    ? {
        ...initialState(),
        currentTrack: snap.currentTrack as Track | null,
        playlist: snap.playlist as Track[],
        isPlaying: snap.isPlaying,
        isLoading: snap.isLoading,
        position: snap.position,
        duration: snap.duration,
        volume: snap.volume,
        quality: snap.quality as PlayerQuality,
        repeatMode: snap.repeatMode as RepeatMode,
        shuffle: snap.shuffle,
      }
    : initialState();
  const [s, dispatch] = useReducer(reducer, initial);
  const [isFullPlayerOpen, setFullPlayerOpen] = React.useState(false);
  const idx = useRef(snap?.playlistIndex ?? -1);
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

  // Wire AudioManager status callback on mount. No cleanup — the singleton
  // explicitly avoids React cleanup so the Sound survives remount cycles.
  useEffect(() => {
    AudioManager.setOnStatus(handleStatus);
    AudioManager.ensureAudioMode().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable status callback — reads state via refs
  const handleStatus = useCallback((status: PlaybackStatus) => {
    if (!status.isLoaded) {
      dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false } });
      return;
    }
    if (status.didJustFinish && !status.isLooping) {
      const s = stateRef.current;
      const pl = s.playlist;

      seekOffset.current = 0;

      // Repeat-one: replay same track
      if (s.repeatMode === 'one' && s.currentTrack) {
        const track = s.currentTrack;
        dispatchRef.current({ type: 'LOAD_TRACK', track });
        AudioManager.load(
          buildStreamUrl(track.id, s.quality),
          true,
          s.volume,
          trackMetadata(track),
        ).catch(() => {
          dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false } });
        });
        return;
      }

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

      if (s.repeatMode === 'off' && nextIdx === 0 && idx.current === pl.length - 1) {
        dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false, position: 0 } });
        return;
      }

      idx.current = nextIdx;
      dispatchRef.current({ type: 'LOAD_TRACK', track: pl[nextIdx] });
      AudioManager.load(
        buildStreamUrl(pl[nextIdx].id, s.quality),
        true,
        s.volume,
        trackMetadata(pl[nextIdx]),
      ).catch(() => {
        dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false } });
      });
      return;
    }
    dispatchRef.current({ type: 'STATUS', status, seekOffset: seekOffset.current });
  }, []);

  // Register the callback each render so it picks up the latest handleStatus
  useEffect(() => {
    AudioManager.setOnStatus(handleStatus);
  }, [handleStatus]);

  // Save snapshot so AudioManager can restore state on remount
  useEffect(() => {
    AudioManager.saveSnapshot({
      currentTrack: s.currentTrack,
      playlist: s.playlist,
      isPlaying: s.isPlaying,
      isLoading: s.isLoading,
      position: s.position,
      duration: s.duration,
      volume: s.volume,
      quality: s.quality,
      repeatMode: s.repeatMode,
      shuffle: s.shuffle,
      playlistIndex: idx.current,
    });
  });

  const loadSound = useCallback(async (track: Track, autoPlay: boolean, seekMs?: number) => {
    await AudioManager.ensureAudioMode();
    const q = stateRef.current.quality;
    const isTrans = q !== 'original';
    const seek = seekMs && isTrans ? seekMs : undefined;
    if (seek) {
      seekOffset.current = seek;
    } else {
      seekOffset.current = 0;
    }
    const url = buildStreamUrl(track.id, q, seek);
    await AudioManager.load(url, autoPlay, stateRef.current.volume, trackMetadata(track));
  }, []);

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
    await AudioManager.pause();
    dispatch({ type: 'PATCH', patch: { isPlaying: false } });
  }, []);

  const resume = useCallback(async () => {
    await AudioManager.play();
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

    if (s.repeatMode === 'off' && i === 0 && idx.current === pl.length - 1) {
      await AudioManager.setPositionAsync(0);
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

    if (s.repeatMode === 'one') {
      await AudioManager.setPositionAsync(0);
      dispatch({ type: 'PATCH', patch: { position: 0 } });
      return;
    }

    if (position > SEEK_THRESHOLD_MS) {
      await AudioManager.setPositionAsync(0);
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
      const track = stateRef.current.currentTrack;
      if (!track) return;
      dispatch({ type: 'PATCH', patch: { isLoading: true } });
      await loadSound(track, stateRef.current.isPlaying, ms);
      dispatch({ type: 'PATCH', patch: { position: ms } });
      return;
    }
    await AudioManager.setPositionAsync(ms);
    dispatch({ type: 'PATCH', patch: { position: ms } });
  }, [loadSound]);

  const setVolume = useCallback(async (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    await AudioManager.setVolumeAsync(c);
    dispatch({ type: 'PATCH', patch: { volume: c } });
  }, []);

  const setQuality = useCallback(async (q: PlayerQuality) => {
    dispatch({ type: 'PATCH', patch: { quality: q } });
    await setItem('player_quality', q);
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

  // Wire native lock-screen / headset remote controls via module-level callbacks
  useEffect(() => {
    setRemoteCallbacks({ play: resume, pause, next, previous, seek });
    return () => setRemoteCallbacks({});
  }, [resume, pause, next, previous, seek]);

  const value: PlayerContextValue = {
    ...s,
    load, play, playPlaylist, pause, resume,
    togglePlayPause, next, playNext, previous, seek, setVolume, setQuality,
    openFullPlayer, closeFullPlayer, toggleRepeat, toggleShuffle, isFullPlayerOpen,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
