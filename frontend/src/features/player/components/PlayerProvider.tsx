import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import { AppState } from 'react-native';
import type { Track } from '@/hooks/generated/types';
import type { PlayerQuality, PlayerState, RepeatMode } from '../types/player';
import { getItem, setItem } from '@/utils/storage';
import { getApiBase, artUrl } from '@/constants/api';
import { useMediaSession } from '../hooks/useMediaSession';
import { setRemoteCallbacks } from '../services/registerRemoteCallbacks';
import * as AudioManager from '../utils/AudioManager';
import type { PlaybackStatus, QueueTrack } from '../utils/AudioManager';

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

function buildQueueTracks(
  playlist: Track[],
  quality: PlayerQuality,
  seekMsByIndex?: Record<number, number>,
): QueueTrack[] {
  return playlist.map((track, index) => ({
    mediaId: track.id,
    url: buildStreamUrl(track.id, quality, seekMsByIndex?.[index]),
    playlistIndex: index,
    meta: trackMetadata(track),
    durationSeconds: track.duration ?? undefined,
  }));
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
    case 'LOAD_TRACK': {
      const d = action.track?.duration ?? 0;
      const isPlaying = action.isPlaying !== undefined ? action.isPlaying : state.isPlaying;
      return {
        ...state,
        currentTrack: action.track,
        playlist: action.playlist ?? state.playlist,
        isPlaying,
        isLoading: false,
        position: 0,
        duration: d * 1000,
      };
    }
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
  const ignoreStalePositionUntil = useRef(0);

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

  const applyPlaylistIndex = useCallback((playlistIndex: number) => {
    const pl = stateRef.current.playlist;
    const track = pl[playlistIndex];
    if (!track) return;

    if (playlistIndex !== idx.current) {
      seekOffset.current = 0;
      idx.current = playlistIndex;
      ignoreStalePositionUntil.current = Date.now() + 1200;
      dispatchRef.current({ type: 'LOAD_TRACK', track, playlist: pl });
    }
  }, []);

  /** Clear seek-derived state before native queue skip (next/prev may race transition). */
  const beginTrackChange = useCallback((targetIndex: number) => {
    seekOffset.current = 0;
    ignoreStalePositionUntil.current = Date.now() + 1200;
    const pl = stateRef.current.playlist;
    const track = pl[targetIndex];
    if (track) {
      dispatchRef.current({ type: 'LOAD_TRACK', track, playlist: pl });
    }
  }, []);

  const syncFromNativePlayer = useCallback(() => {
    if (!AudioManager.hasActiveSound()) return;

    const playlistIndex = AudioManager.getActivePlaylistIndex();
    if (playlistIndex != null) {
      applyPlaylistIndex(playlistIndex);
    }
    AudioManager.refreshPlaybackState();
  }, [applyPlaylistIndex]);

  const handleQueueTransition = useCallback((playlistIndex: number) => {
    applyPlaylistIndex(playlistIndex);
  }, [applyPlaylistIndex]);

  // Re-sync React state when returning to the app — native next/prev can advance
  // the queue in the background without running our JS callbacks.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncFromNativePlayer();
      }
    });
    return () => sub.remove();
  }, [syncFromNativePlayer]);

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
        AudioManager.reloadActiveItem(
          buildStreamUrl(track.id, s.quality),
          true,
          s.volume,
          trackMetadata(track),
          idx.current,
          track.id,
        ).catch(() => {
          dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false } });
        });
        return;
      }

      const atPlaylistEnd = idx.current >= pl.length - 1;
      if (!atPlaylistEnd) {
        // RNTP auto-advances in the queue; MediaItemTransition syncs UI.
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
        nextIdx = 0;
      }

      if (s.repeatMode === 'off') {
        dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false, position: 0 } });
        return;
      }

      idx.current = nextIdx;
      dispatchRef.current({ type: 'LOAD_TRACK', track: pl[nextIdx] });
      AudioManager.setQueue(
        buildQueueTracks(pl, s.quality),
        nextIdx,
        true,
        s.volume,
      ).catch(() => {
        dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false } });
      });
      return;
    }
    const offset = seekOffset.current;
    const position = status.positionMillis + offset;
    if (Date.now() < ignoreStalePositionUntil.current && position > 1500) {
      dispatchRef.current({
        type: 'PATCH',
        patch: { isPlaying: status.isPlaying, isLoading: status.isBuffering, position: 0 },
      });
      return;
    }
    dispatchRef.current({ type: 'STATUS', status, seekOffset: offset });
  }, []);

  // Wire AudioManager status callback on mount. No cleanup — the singleton
  // explicitly avoids React cleanup so the Sound survives remount cycles.
  useEffect(() => {
    AudioManager.setOnStatus(handleStatus);
    AudioManager.ensureAudioMode()
      .then(() => syncFromNativePlayer())
      .catch(() => {});
  }, [handleStatus, syncFromNativePlayer]);

  // Register the callback each render so it picks up the latest handleStatus
  useEffect(() => {
    AudioManager.setOnStatus(handleStatus);
  }, [handleStatus]);

  useEffect(() => {
    AudioManager.setOnQueueTransition(handleQueueTransition);
  }, [handleQueueTransition]);

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

  const syncQueue = useCallback(async (
    playlist: Track[],
    playlistIndex: number,
    autoPlay: boolean,
    seekMs?: number,
  ) => {
    await AudioManager.ensureAudioMode();
    const q = stateRef.current.quality;
    const isTrans = q !== 'original';
    const seek = seekMs && isTrans ? seekMs : undefined;
    if (seek) {
      seekOffset.current = seek;
    } else {
      seekOffset.current = 0;
    }
    const seekByIndex = seek != null ? { [playlistIndex]: seek } : undefined;
    await AudioManager.setQueue(
      buildQueueTracks(playlist, q, seekByIndex),
      playlistIndex,
      autoPlay,
      stateRef.current.volume,
    );
  }, []);

  const reloadCurrent = useCallback(async (autoPlay: boolean, seekMs?: number) => {
    const s = stateRef.current;
    const track = s.currentTrack;
    if (!track) return;

    await AudioManager.ensureAudioMode();
    const q = s.quality;
    const isTrans = q !== 'original';
    const seek = seekMs && isTrans ? seekMs : undefined;
    if (seek) {
      seekOffset.current = seek;
    } else {
      seekOffset.current = 0;
    }

    await AudioManager.reloadActiveItem(
      buildStreamUrl(track.id, q, seek),
      autoPlay,
      s.volume,
      trackMetadata(track),
      idx.current,
      track.id,
    );
  }, []);

  // ---- actions (all read state via stateRef, write via dispatch) -----------

  const load = useCallback(async (track: Track) => {
    dispatch({ type: 'LOAD_TRACK', track, playlist: [track], isPlaying: false });
    idx.current = 0;
    try { await syncQueue([track], 0, false); } catch {}
  }, [syncQueue]);

  const play = useCallback(async (track: Track) => {
    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await syncQueue([track], 0, true);
    dispatch({ type: 'LOAD_TRACK', track, playlist: [track] });
    idx.current = 0;
  }, [syncQueue]);

  const playPlaylist = useCallback(async (tracks: Track[], start = 0) => {
    if (!tracks.length) return;
    const i = Math.max(0, Math.min(start, tracks.length - 1));
    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await syncQueue(tracks, i, true);
    dispatch({ type: 'LOAD_TRACK', track: tracks[i], playlist: tracks });
    idx.current = i;
  }, [syncQueue]);

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
      await reloadCurrent(true, 0);
      dispatch({ type: 'LOAD_TRACK', track: s.currentTrack, playlist: pl });
      return;
    }

    let i: number;
    if (s.shuffle) {
      i = getRandomIndex(idx.current, pl.length);
    } else {
      i = idx.current + 1;
    }

    if (!s.shuffle && i >= pl.length) {
      if (s.repeatMode === 'all') {
        i = 0;
      } else {
        await AudioManager.setPositionAsync(0);
        dispatch({ type: 'PATCH', patch: { isPlaying: false, position: 0 } });
        return;
      }
    }

    if (s.shuffle || !AudioManager.canSkipNextInQueue() || i !== idx.current + 1) {
      dispatch({ type: 'PATCH', patch: { isLoading: true } });
      await syncQueue(pl, i, true);
      seekOffset.current = 0;
      ignoreStalePositionUntil.current = Date.now() + 1200;
      dispatch({ type: 'LOAD_TRACK', track: pl[i], playlist: pl });
      idx.current = i;
      return;
    }

    beginTrackChange(i);
    AudioManager.skipToNextInQueue();
    idx.current = i;
  }, [reloadCurrent, syncQueue, beginTrackChange]);

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
      dispatch({ type: 'PATCH', patch: { isLoading: true } });
      await syncQueue(playlist, i, true);
      dispatch({ type: 'LOAD_TRACK', track: playlist[i], playlist });
      idx.current = i;
      return;
    }

    if (idx.current <= 0) {
      i = playlist.length - 1;
      if (s.repeatMode === 'off' && playlist.length <= 1) {
        await AudioManager.setPositionAsync(0);
        dispatch({ type: 'PATCH', patch: { position: 0 } });
        return;
      }
      dispatch({ type: 'PATCH', patch: { isLoading: true } });
      await syncQueue(playlist, i, true);
      dispatch({ type: 'LOAD_TRACK', track: playlist[i], playlist });
      idx.current = i;
      return;
    }

    if (AudioManager.canSkipPreviousInQueue()) {
      i = idx.current - 1;
      beginTrackChange(i);
      AudioManager.skipToPreviousInQueue();
      idx.current = i;
      return;
    }

    i = idx.current - 1;
    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await syncQueue(playlist, i, true);
    dispatch({ type: 'LOAD_TRACK', track: playlist[i], playlist });
    idx.current = i;
  }, [syncQueue]);

  const seek = useCallback(async (ms: number) => {
    const q = stateRef.current.quality;
    if (q !== 'original') {
      const track = stateRef.current.currentTrack;
      if (!track) return;
      dispatch({ type: 'PATCH', patch: { isLoading: true } });
      await reloadCurrent(stateRef.current.isPlaying, ms);
      dispatch({ type: 'PATCH', patch: { position: ms } });
      return;
    }
    await AudioManager.setPositionAsync(ms);
    dispatch({ type: 'PATCH', patch: { position: ms } });
  }, [reloadCurrent]);

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
      await reloadCurrent(wasPlaying, pos);
    }
  }, [reloadCurrent]);

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
