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

/**
 * Module-level singleton wrapping @rntp/player.
 *
 * Survives React remount cycles. Call load() to load/reload a track,
 * then pause/resume/setPosition as needed.
 */

let _initialized = false;
let _onStatus: StatusCallback | null = null;
let _statusSubscriptions: { remove: () => void }[] = [];
let _hasLoaded = false;

type StatusCallback = (status: PlaybackStatus) => void;

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
  return {
    isLoaded: state !== PlaybackState.Idle && state !== PlaybackState.Error,
    isPlaying: TrackPlayer.isPlaying(),
    isBuffering: state === PlaybackState.Buffering,
    positionMillis: progress.position * 1000,
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

function wireStatusListeners(): void {
  for (const sub of _statusSubscriptions) sub.remove();
  _statusSubscriptions = [];

  _statusSubscriptions.push(
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, () => emitStatus()),
    TrackPlayer.addEventListener(Event.IsPlayingChanged, () => emitStatus()),
    TrackPlayer.addEventListener(Event.PlaybackStateChanged, (e) => {
      if (e.state === PlaybackState.Ended) {
        emitStatus({ didJustFinish: true, isPlaying: false });
      } else {
        emitStatus();
      }
    }),
  );
}

export async function setupPlayer(): Promise<void> {
  if (_initialized) return;

  TrackPlayer.setupPlayer({
    contentType: 'music',
    handleAudioBecomingNoisy: true,
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
      [PlayerCommand.Next]: 'js',
      [PlayerCommand.Previous]: 'js',
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

function toMediaItem(uri: string, meta?: LockScreenMetadata): MediaItem {
  return {
    mediaId: uri,
    url: uri,
    title: meta?.title,
    artist: meta?.artist,
    albumTitle: meta?.albumTitle,
    artworkUrl: meta?.artworkUrl,
  };
}

export async function load(
  uri: string,
  shouldPlay: boolean,
  volume: number,
  meta?: LockScreenMetadata,
): Promise<void> {
  await setupPlayer();
  TrackPlayer.setVolume(volume);
  TrackPlayer.setMediaItems([toMediaItem(uri, meta)]);
  _hasLoaded = true;
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
  }
}

export async function setPositionAsync(ms: number): Promise<void> {
  TrackPlayer.seekTo(ms / 1000);
}

export async function setVolumeAsync(v: number): Promise<void> {
  TrackPlayer.setVolume(v);
}

/** @internal Test-only reset of module singleton state. */
export function _resetForTests(): void {
  for (const sub of _statusSubscriptions) sub.remove();
  _statusSubscriptions = [];
  _initialized = false;
  _hasLoaded = false;
  _onStatus = null;
}

/** No-op — metadata travels with media items in load(). */
export function setLockScreenMetadata(_meta: LockScreenMetadata): void {}

/** No-op — clearing is handled by unload/clear. */
export function clearLockScreenControls(): void {}
