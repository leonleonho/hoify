import TrackPlayer, {
  Event,
  PlaybackState,
  PlayerCommand,
  type MediaItem,
} from '@rntp/player';
import { registerForegroundRemoteListeners } from '../services/PlaybackService';

/** Metadata displayed on the device lock screen / system notification. */
export interface LockScreenMetadata {
  title?: string;
  artist?: string;
  albumTitle?: string;
  artworkUrl?: string;
}

export interface QueueTrack {
  mediaId: string;
  url: string;
  playlistIndex: number;
  meta?: LockScreenMetadata;
  durationSeconds?: number;
}

/**
 * Module-level singleton wrapping @rntp/player.
 *
 * Survives React remount cycles. Call load() to load/reload a track,
 * then pause/resume/setPosition as needed.
 */

let _initialized = false;
let _onStatus: StatusCallback | null = null;
let _onQueueTransition: QueueTransitionCallback | null = null;
let _statusSubscriptions: { remove: () => void }[] = [];
let _hasLoaded = false;
let _activeMediaId: string | null = null;
let _lastTransitionAt = 0;

/** Drop progress from the previous item or the pre-buffer window after a skip. */
const TRANSITION_STALE_MS = 1200;
const TRANSITION_STALE_POSITION_S = 1.5;

function markMediaTransition(item?: MediaItem | null): void {
  const nextId = item?.mediaId ?? null;
  const trackChanged =
    _activeMediaId != null && nextId != null && nextId !== _activeMediaId;
  _activeMediaId = nextId;
  if (trackChanged) {
    _lastTransitionAt = Date.now();
  }
}

function isStaleProgress(mediaId: string | undefined, positionSeconds: number): boolean {
  if (mediaId && _activeMediaId && mediaId !== _activeMediaId) return true;
  if (
    _lastTransitionAt > 0 &&
    Date.now() - _lastTransitionAt < TRANSITION_STALE_MS &&
    positionSeconds > TRANSITION_STALE_POSITION_S
  ) {
    return true;
  }
  return false;
}

function stalePositionOverride(positionSeconds: number): Partial<PlaybackStatus> | undefined {
  if (isStaleProgress(_activeMediaId ?? undefined, positionSeconds)) {
    return { positionMillis: 0 };
  }
  return undefined;
}

type StatusCallback = (status: PlaybackStatus) => void;
type QueueTransitionCallback = (playlistIndex: number) => void;

/** Normalised shape that PlayerProvider's reducer already understands. */
export interface PlaybackStatus {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  didJustFinish: boolean;
  isLooping: boolean;
}

// ── state persistence (sessionStorage, survives remount, no leaking in tests) ─

const SNAPSHOT_KEY = 'hoify_player_snapshot';

/** Saved via JSON.stringify, restored as opaque data. PlayerProvider casts at use-site. */
export interface PlayerSnapshot {
  currentTrack: unknown;
  playlist: unknown;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  volume: number;
  quality: string;
  repeatMode: string;
  shuffle: boolean;
  playlistIndex: number;
}

export function saveSnapshot(snap: PlayerSnapshot): void {
  try { sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap)); } catch {}
}

export function popSnapshot(): PlayerSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (raw) { sessionStorage.removeItem(SNAPSHOT_KEY); return JSON.parse(raw); }
  } catch {}
  return null;
}

function buildPlaybackStatus(overrides?: Partial<PlaybackStatus>): PlaybackStatus {
  const progress = TrackPlayer.getProgress();
  const state = TrackPlayer.getPlaybackState();
  let positionMillis = progress.position * 1000;
  if (
    overrides?.positionMillis === undefined &&
    isStaleProgress(_activeMediaId ?? undefined, progress.position)
  ) {
    positionMillis = 0;
  }
  return {
    isLoaded: state !== PlaybackState.Idle && state !== PlaybackState.Error,
    isPlaying: TrackPlayer.isPlaying(),
    isBuffering: state === PlaybackState.Buffering,
    positionMillis,
    durationMillis: progress.duration * 1000,
    didJustFinish: false,
    isLooping: false,
    ...overrides,
  };
}

function emitStatus(overrides?: Partial<PlaybackStatus>): void {
  if (!_onStatus) return;
  _onStatus(buildPlaybackStatus(overrides));
}

function toMediaItem(track: QueueTrack): MediaItem {
  return {
    mediaId: track.mediaId,
    url: track.url,
    title: track.meta?.title,
    artist: track.meta?.artist,
    albumTitle: track.meta?.albumTitle,
    artworkUrl: track.meta?.artworkUrl,
    duration: track.durationSeconds,
    extras: { playlistIndex: track.playlistIndex },
  };
}

function wireStatusListeners(): void {
  for (const sub of _statusSubscriptions) sub.remove();
  _statusSubscriptions = [];

  _statusSubscriptions.push(
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (e) => {
      if (isStaleProgress(e.mediaId, e.position)) return;
      emitStatus({
        positionMillis: e.position * 1000,
        durationMillis: e.duration * 1000,
      });
    }),
    TrackPlayer.addEventListener(Event.IsPlayingChanged, () => {
      emitStatus(stalePositionOverride(TrackPlayer.getProgress().position));
    }),
    TrackPlayer.addEventListener(Event.PlaybackStateChanged, (e) => {
      if (e.state === PlaybackState.Ended) {
        emitStatus({ didJustFinish: true, isPlaying: false });
      } else {
        emitStatus(stalePositionOverride(TrackPlayer.getProgress().position));
      }
    }),
    TrackPlayer.addEventListener(Event.MediaItemTransition, (e) => {
      markMediaTransition(e.item);
      const playlistIndex = e.item?.extras?.playlistIndex;
      if (typeof playlistIndex === 'number') {
        _onQueueTransition?.(playlistIndex);
      }
      emitStatus({ positionMillis: 0 });
    }),
  );
}

export async function setupPlayer(): Promise<void> {
  if (_initialized) return;

  TrackPlayer.setupPlayer({
    contentType: 'music',
    handleAudioBecomingNoisy: true,
    // RNTP v5 only emits PlaybackProgressUpdated when intervalSeconds > 0.
    progressSync: { intervalSeconds: 0.25 },
    android: { wakeMode: 'network' },
  });

  TrackPlayer.setCommands({
    capabilities: [
      PlayerCommand.PlayPause,
      PlayerCommand.Next,
      PlayerCommand.Previous,
      PlayerCommand.Seek,
    ],
    handling: 'hybrid',
    perCommandHandling: {
      [PlayerCommand.Seek]: 'js',
    },
  });

  registerForegroundRemoteListeners();
  wireStatusListeners();
  _initialized = true;
}

/** @deprecated Use setupPlayer — kept for minimal PlayerProvider churn. */
export async function ensureAudioMode(): Promise<void> {
  await setupPlayer();
}

/** Returns true when a track has been loaded at least once. */
export function hasActiveSound(): boolean {
  return _hasLoaded;
}

/** Register a status callback. Set null to clear. */
export function setOnStatus(cb: StatusCallback | null): void {
  _onStatus = cb;
  if (cb && _initialized) {
    wireStatusListeners();
  }
}

/** Fires when RNTP advances to another item in the queue. */
export function setOnQueueTransition(cb: QueueTransitionCallback | null): void {
  _onQueueTransition = cb;
}

export function getActivePlaylistIndex(): number | null {
  const item = TrackPlayer.getActiveMediaItem();
  const fromExtras = item?.extras?.playlistIndex;
  if (typeof fromExtras === 'number') return fromExtras;
  return TrackPlayer.getActiveMediaItemIndex();
}

export function getActiveQueueIndex(): number | null {
  return TrackPlayer.getActiveMediaItemIndex();
}

export function getQueueLength(): number {
  return TrackPlayer.getQueue().length;
}

export function canSkipNextInQueue(): boolean {
  const queue = TrackPlayer.getQueue();
  const active = TrackPlayer.getActiveMediaItemIndex();
  return active != null && active < queue.length - 1;
}

export function canSkipPreviousInQueue(): boolean {
  const active = TrackPlayer.getActiveMediaItemIndex();
  return active != null && active > 0;
}

export async function setQueue(
  tracks: QueueTrack[],
  playlistIndex: number,
  shouldPlay: boolean,
  volume: number,
): Promise<void> {
  if (!tracks.length) return;

  await setupPlayer();
  const queueIndex = Math.max(0, Math.min(playlistIndex, tracks.length - 1));

  TrackPlayer.setVolume(volume);
  TrackPlayer.setMediaItems(tracks.map(toMediaItem), queueIndex);
  _activeMediaId = tracks[queueIndex]?.mediaId ?? null;
  _hasLoaded = true;
  if (shouldPlay) {
    TrackPlayer.play();
  }
  emitStatus();
}

export function skipToNextInQueue(): boolean {
  if (!canSkipNextInQueue()) return false;
  TrackPlayer.skipToNext();
  return true;
}

export function skipToPreviousInQueue(): boolean {
  if (!canSkipPreviousInQueue()) return false;
  TrackPlayer.skipToPrevious();
  return true;
}

export async function load(
  uri: string,
  shouldPlay: boolean,
  volume: number,
  meta?: LockScreenMetadata,
  playlistIndex = 0,
): Promise<void> {
  await setQueue(
    [{ mediaId: uri, url: uri, playlistIndex, meta }],
    playlistIndex,
    shouldPlay,
    volume,
  );
}

export async function reloadActiveItem(
  uri: string,
  shouldPlay: boolean,
  volume: number,
  meta?: LockScreenMetadata,
  playlistIndex?: number,
  mediaId?: string,
): Promise<void> {
  await setupPlayer();
  const activeIndex = TrackPlayer.getActiveMediaItemIndex();
  const activeItem = TrackPlayer.getActiveMediaItem();
  const resolvedMediaId = mediaId ?? activeItem?.mediaId ?? uri;
  const item: QueueTrack = {
    mediaId: resolvedMediaId,
    url: uri,
    playlistIndex: playlistIndex ?? getActivePlaylistIndex() ?? 0,
    meta,
  };

  TrackPlayer.setVolume(volume);
  if (activeIndex != null) {
    TrackPlayer.replaceMediaItem(activeIndex, toMediaItem(item));
  } else {
    TrackPlayer.setMediaItems([toMediaItem(item)], 0);
  }
  _hasLoaded = true;
  _activeMediaId = resolvedMediaId;
  if (shouldPlay) {
    TrackPlayer.play();
  }
  emitStatus();
}

export async function play(): Promise<void> {
  TrackPlayer.play();
}

export async function pause(): Promise<void> {
  TrackPlayer.pause();
}

export async function unload(): Promise<void> {
  if (_hasLoaded) {
    for (const sub of _statusSubscriptions) sub.remove();
    _statusSubscriptions = [];
    TrackPlayer.clear();
    _hasLoaded = false;
    _onStatus = null;
    _onQueueTransition = null;
    _activeMediaId = null;
    _lastTransitionAt = 0;
  }
}

export async function setPositionAsync(ms: number): Promise<void> {
  TrackPlayer.seekTo(ms / 1000);
}

export async function setVolumeAsync(v: number): Promise<void> {
  TrackPlayer.setVolume(v);
}

/** Re-read native playback state and notify the status callback. */
export function refreshPlaybackState(): void {
  emitStatus(stalePositionOverride(TrackPlayer.getProgress().position));
}

/** @internal Test-only reset of module singleton state. */
export function _resetForTests(): void {
  for (const sub of _statusSubscriptions) sub.remove();
  _statusSubscriptions = [];
  _initialized = false;
  _hasLoaded = false;
  _onStatus = null;
  _onQueueTransition = null;
  _activeMediaId = null;
  _lastTransitionAt = 0;
}

/** No-op — metadata travels with media items in load(). */
export function setLockScreenMetadata(_meta: LockScreenMetadata): void {}

/** No-op — clearing is handled by unload/clear. */
export function clearLockScreenControls(): void {}
