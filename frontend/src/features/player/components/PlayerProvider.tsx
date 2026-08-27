import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';
import { AppState, Platform } from 'react-native';
import type { Track } from '@/hooks/generated/types';
import type { PlayerQuality, PlayerState, RepeatMode } from '../types/player';
import { getItem, setItem } from '@/utils/storage';
import { artUrl } from '@/constants/api';
import { resolveTrackUrl } from '@/features/offline/resolveTrackUrl';
import { getLocalUri } from '@/features/offline/localUriIndex';
import { useMediaSession } from '../hooks/useMediaSession';
import { useAndroidAutoBrowse } from '../hooks/useAndroidAutoBrowse';
import { getCachedPlaylistTracks } from '../services/androidAutoBrowse';
import { setRemoteCallbacks } from '../services/registerRemoteCallbacks';
import * as AudioManager from '../utils/AudioManager';
import type {
  PlaybackStatus,
  QueueTrack,
  QueueTransitionExtras,
} from '../utils/AudioManager';

/** Mounts Android Auto browse sync only on Android (needs ApolloProvider). */
function AndroidAutoBrowseSync() {
  useAndroidAutoBrowse();
  return null;
}

const SEEK_THRESHOLD_MS = 3000;

function trackMetadata(track: Track): AudioManager.LockScreenMetadata {
  return {
    title: track.title,
    artist: track.trackArtist ?? track.album.artist.name,
    albumTitle: track.album.title,
    artworkUrl: track.album.coverUrl ? artUrl(track.album.coverUrl) : undefined,
  };
}

function buildQueueTracks(
  playlist: Track[],
  quality: PlayerQuality,
  seekMsByIndex?: Record<number, number>,
): QueueTrack[] {
  return playlist.map((track, index) => ({
    mediaId: track.id,
    url: resolveTrackUrl(track.id, quality, seekMsByIndex?.[index]),
    playlistIndex: index,
    meta: trackMetadata(track),
    durationSeconds: track.duration ?? undefined,
    gain: track.gainMultiplier ?? 1,
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
    currentTrack: null,
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
  playNext: (track: Track) => Promise<void>;
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
  /** Full Track objects for the loaded set — order lives in the native queue. */
  const tracksRef = useRef<Map<string, Track>>(
    new Map((snap?.playlist as Track[] | undefined)?.map((t) => [t.id, t]) ?? []),
  );
  const seekOffset = useRef(0);
  const ignoreStalePositionUntil = useRef(0);
  /** Playlist last adopted from Android Auto browse extras (null = phone-driven). */
  const adoptedBrowsePlaylistId = useRef<string | null>(null);

  // Refs that always hold latest value, so callbacks don't go stale
  const stateRef = useRef(s);
  stateRef.current = s;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  /** Effective native repeat: native All can't re-randomize, so repeat-all + shuffle falls back to JS. */
  const effectiveRepeat = useCallback((repeat: RepeatMode, shuffle: boolean): RepeatMode => {
    if (repeat === 'one') return 'one';
    if (repeat === 'all') return shuffle ? 'off' : 'all';
    return 'off';
  }, []);

  /** Push effective repeat to RNTP. Optional overrides avoid stale stateRef reads after dispatch. */
  const applyRepeatMode = useCallback((repeat?: RepeatMode, shuffle?: boolean) => {
    const s = stateRef.current;
    AudioManager.setRepeatMode(effectiveRepeat(repeat ?? s.repeatMode, shuffle ?? s.shuffle));
  }, [effectiveRepeat]);

  // Load persisted quality + repeat mode on mount
  useEffect(() => {
    getItem('player_quality').then((q) => {
      if (q === 'original' || q === 'high' || q === 'medium' || q === 'low') {
        dispatch({ type: 'PATCH', patch: { quality: q as PlayerQuality } });
      }
    }).catch(() => {});
    getItem('player_repeat_mode').then((rm) => {
      if (rm === 'off' || rm === 'all' || rm === 'one') {
        const mode = rm as RepeatMode;
        dispatch({ type: 'PATCH', patch: { repeatMode: mode } });
        applyRepeatMode(mode);
      }
    }).catch(() => {});
  }, [applyRepeatMode]);

  /** Ordered Track[] resolved from the native queue (mediaId → full Track). */
  const currentPlaylistTracks = useCallback((): Track[] => {
    return AudioManager.getQueue()
      .map((q) => (q.mediaId ? tracksRef.current.get(q.mediaId) : undefined))
      .filter((t): t is Track => Boolean(t));
  }, []);

  const applyPlaylistIndex = useCallback((playlistIndex: number, nativeIndex?: number) => {
    // Native queue is the source of truth for order and position. insertNextInQueue
    // splices the native queue without rewriting extras.playlistIndex on shifted
    // items, so the native queue position is authoritative. Browse-driven playback
    // short-circuits in handleQueueTransition before reaching here.
    const nativeIdx = nativeIndex ?? AudioManager.getActiveQueueIndex();
    const i = nativeIdx != null && nativeIdx >= 0 ? nativeIdx : playlistIndex;
    const queue = AudioManager.getQueue();
    const track = queue[i] ? tracksRef.current.get(queue[i].mediaId ?? '') : undefined;
    if (!track) return;

    if (i !== idx.current) {
      seekOffset.current = 0;
      idx.current = i;
      ignoreStalePositionUntil.current = Date.now() + 1200;
      dispatchRef.current({ type: 'LOAD_TRACK', track });
    }
  }, []);

  /** Clear seek-derived state before native queue skip (next/prev may race transition). */
  const beginTrackChange = useCallback((targetIndex: number) => {
    seekOffset.current = 0;
    ignoreStalePositionUntil.current = Date.now() + 1200;
    const queue = AudioManager.getQueue();
    const track = queue[targetIndex] ? tracksRef.current.get(queue[targetIndex].mediaId ?? '') : undefined;
    if (track) {
      dispatchRef.current({ type: 'LOAD_TRACK', track });
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

  const handleQueueTransition = useCallback((
    playlistIndex: number,
    extras?: QueueTransitionExtras,
  ) => {
    const playlistId = extras?.playlistId;
    if (typeof playlistId === 'string') {
      if (playlistId !== adoptedBrowsePlaylistId.current) {
        const tracks = getCachedPlaylistTracks(playlistId);
        if (tracks?.length) {
          const i = Math.max(0, Math.min(playlistIndex, tracks.length - 1));
          const track = tracks[i];
          adoptedBrowsePlaylistId.current = playlistId;
          for (const t of tracks) tracksRef.current.set(t.id, t);
          seekOffset.current = 0;
          idx.current = i;
          ignoreStalePositionUntil.current = Date.now() + 1200;
          dispatchRef.current({
            type: 'LOAD_TRACK',
            track,
            isPlaying: true,
          });
          return;
        }
      }
    }
    applyPlaylistIndex(playlistIndex, extras?.nativeIndex as number | undefined);
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
      const queueLen = AudioManager.getQueueLength();

      seekOffset.current = 0;

      // Native RepeatMode.One / RepeatMode.All (non-shuffle) handle looping, so
      // didJustFinish only fires when the effective native mode is Off — i.e.
      // repeat 'off', or repeat 'all' with shuffle on (native All can't re-randomize).
      const atEnd = queueLen <= 0 || idx.current >= queueLen - 1;
      if (!atEnd) {
        // RNTP auto-advances in the queue; MediaItemTransition syncs UI.
        return;
      }

      if (s.repeatMode === 'off' || queueLen <= 1) {
        dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false, position: 0 } });
        return;
      }

      // repeat 'all' + shuffle: re-randomize at queue end.
      const nextIdx = getRandomIndex(idx.current, queueLen);
      const queue = AudioManager.getQueue();
      const track = queue[nextIdx] ? tracksRef.current.get(queue[nextIdx].mediaId ?? '') : undefined;
      if (!track) {
        dispatchRef.current({ type: 'PATCH', patch: { isPlaying: false } });
        return;
      }
      idx.current = nextIdx;
      dispatchRef.current({ type: 'LOAD_TRACK', track });
      AudioManager.setQueue(
        buildQueueTracks(currentPlaylistTracks(), s.quality),
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
      playlist: currentPlaylistTracks(),
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
    for (const t of playlist) tracksRef.current.set(t.id, t);
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
    applyRepeatMode();
  }, [applyRepeatMode]);

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
      resolveTrackUrl(track.id, q, seek),
      autoPlay,
      s.volume,
      trackMetadata(track),
      idx.current,
      track.id,
    );
  }, []);

  // ---- actions (all read state via stateRef, write via dispatch) -----------

  const load = useCallback(async (track: Track) => {
    adoptedBrowsePlaylistId.current = null;
    tracksRef.current.clear();
    tracksRef.current.set(track.id, track);
    dispatch({ type: 'LOAD_TRACK', track, isPlaying: false });
    idx.current = 0;
    try { await syncQueue([track], 0, false); } catch {}
  }, [syncQueue]);

  const play = useCallback(async (track: Track) => {
    adoptedBrowsePlaylistId.current = null;
    tracksRef.current.clear();
    tracksRef.current.set(track.id, track);
    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await syncQueue([track], 0, true);
    dispatch({ type: 'LOAD_TRACK', track });
    idx.current = 0;
  }, [syncQueue]);

  const playPlaylist = useCallback(async (tracks: Track[], start = 0) => {
    if (!tracks.length) return;
    adoptedBrowsePlaylistId.current = null;
    tracksRef.current.clear();
    for (const t of tracks) tracksRef.current.set(t.id, t);
    const i = Math.max(0, Math.min(start, tracks.length - 1));
    dispatch({ type: 'PATCH', patch: { isLoading: true } });
    await syncQueue(tracks, i, true);
    dispatch({ type: 'LOAD_TRACK', track: tracks[i] });
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

  const playNext = useCallback(async (track: Track) => {
    const s = stateRef.current;
    if (!AudioManager.getQueueLength()) return;
    const insertAt = idx.current + 1;
    tracksRef.current.set(track.id, track);

    const item: QueueTrack = {
      mediaId: track.id,
      url: resolveTrackUrl(track.id, s.quality),
      playlistIndex: insertAt,
      meta: trackMetadata(track),
      durationSeconds: track.duration ?? undefined,
      gain: track.gainMultiplier ?? 1,
    };
    if (AudioManager.insertNextInQueue(item)) return;
    // No active native item — fall back to a full queue rebuild.
    try {
      await AudioManager.setQueue(
        buildQueueTracks(currentPlaylistTracks(), s.quality),
        idx.current,
        s.isPlaying,
        s.volume,
      );
    } catch {}
  }, [currentPlaylistTracks]);

  const next = useCallback(async () => {
    const s = stateRef.current;
    const queueLen = AudioManager.getQueueLength();
    if (!queueLen) return;

    // Native RepeatMode.One replays the active item on end; manual next advances.
    let i: number;
    if (s.shuffle) {
      i = getRandomIndex(idx.current, queueLen);
    } else {
      i = idx.current + 1;
    }

    if (!s.shuffle && i >= queueLen) {
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
      await syncQueue(currentPlaylistTracks(), i, true);
      seekOffset.current = 0;
      ignoreStalePositionUntil.current = Date.now() + 1200;
      const track = tracksRef.current.get(AudioManager.getQueue()[i]?.mediaId ?? '');
      if (track) dispatch({ type: 'LOAD_TRACK', track });
      idx.current = i;
      return;
    }

    beginTrackChange(i);
    AudioManager.skipToNextInQueue();
    idx.current = i;
  }, [currentPlaylistTracks, syncQueue, beginTrackChange]);

  const previous = useCallback(async () => {
    const s = stateRef.current;
    const { position } = s;
    const queueLen = AudioManager.getQueueLength();
    if (!queueLen) return;

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
      i = getRandomIndex(idx.current, queueLen);
      dispatch({ type: 'PATCH', patch: { isLoading: true } });
      await syncQueue(currentPlaylistTracks(), i, true);
      const track = tracksRef.current.get(AudioManager.getQueue()[i]?.mediaId ?? '');
      if (track) dispatch({ type: 'LOAD_TRACK', track });
      idx.current = i;
      return;
    }

    if (idx.current <= 0) {
      i = queueLen - 1;
      if (s.repeatMode === 'off' && queueLen <= 1) {
        await AudioManager.setPositionAsync(0);
        dispatch({ type: 'PATCH', patch: { position: 0 } });
        return;
      }
      dispatch({ type: 'PATCH', patch: { isLoading: true } });
      await syncQueue(currentPlaylistTracks(), i, true);
      const track = tracksRef.current.get(AudioManager.getQueue()[i]?.mediaId ?? '');
      if (track) dispatch({ type: 'LOAD_TRACK', track });
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
    await syncQueue(currentPlaylistTracks(), i, true);
    const track = tracksRef.current.get(AudioManager.getQueue()[i]?.mediaId ?? '');
    if (track) dispatch({ type: 'LOAD_TRACK', track });
    idx.current = i;
  }, [currentPlaylistTracks, syncQueue, beginTrackChange]);

  const seek = useCallback(async (ms: number) => {
    const track = stateRef.current.currentTrack;
    // Local files always support native seek; ignore transcoder seek URLs
    if (track && getLocalUri(track.id)) {
      await AudioManager.setPositionAsync(ms);
      dispatch({ type: 'PATCH', patch: { position: ms } });
      return;
    }
    const q = stateRef.current.quality;
    if (q !== 'original') {
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
    applyRepeatMode(next[current]);
    setItem('player_repeat_mode', next[current]).catch(() => {});
  }, [applyRepeatMode]);

  const toggleShuffle = useCallback(() => {
    const nextShuffle = !stateRef.current.shuffle;
    dispatch({ type: 'PATCH', patch: { shuffle: nextShuffle } });
    applyRepeatMode(undefined, nextShuffle);
  }, [applyRepeatMode]);

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

  return (
    <PlayerContext.Provider value={value}>
      {Platform.OS === 'android' ? <AndroidAutoBrowseSync /> : null}
      {children}
    </PlayerContext.Provider>
  );
}
