import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioStatus, AudioPlayer } from 'expo-audio';

/** Metadata displayed on the device lock screen / system notification. */
export interface LockScreenMetadata {
  title?: string;
  artist?: string;
  albumTitle?: string;
  artworkUrl?: string;
}

/**
 * Module-level singleton owning a single expo-audio AudioPlayer instance.
 *
 * The AudioPlayer instance survives React remount cycles caused by browser
 * history navigation (popstate → resetRoot). The underlying HTMLAudioElement
 * stays alive in the DOM even when PlayerProvider unmounts/remounts.
 *
 * Usage: call load() to load/reload a track, then pause/resume/setPosition
 * as needed. Unload is explicit — never automatic on cleanup.
 */

let _player: AudioPlayer | null = null;
let _onStatus: StatusCallback | null = null;
let _statusSubscription: { remove: () => void } | null = null;
let _lockScreenActivated = false;
let _lastLockScreenMeta: LockScreenMetadata | null = null;

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

function getPlayer(): AudioPlayer {
  if (!_player) {
    _player = createAudioPlayer();
  }
  return _player;
}

/** Returns true when the singleton has been loaded at least once. */
export function hasActiveSound(): boolean {
  return _player !== null;
}

/** Register a status callback. Set null to clear. */
export function setOnStatus(cb: StatusCallback | null): void {
  _onStatus = cb;
  // Tear down old subscription
  if (_statusSubscription) {
    _statusSubscription.remove();
    _statusSubscription = null;
  }
  // Wire new subscription if we have both a player and a callback
  if (_player && cb) {
    _statusSubscription = _player.addListener('playbackStatusUpdate', handleStatus);
  }
}

function handleStatus(status: AudioStatus): void {
  if (!_onStatus) return;
  _onStatus({
    isLoaded: status.isLoaded,
    isPlaying: status.playing,
    isBuffering: status.isBuffering,
    positionMillis: status.currentTime * 1000,
    durationMillis: status.duration * 1000,
    didJustFinish: status.didJustFinish,
    isLooping: status.loop,
  });
}

export async function ensureAudioMode(): Promise<void> {
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    // 'doNotMix' is required for lock screen controls to work
    interruptionMode: 'doNotMix',
  });
}

async function prepare(): Promise<void> {
  await ensureAudioMode();
}

export async function load(
  uri: string,
  shouldPlay: boolean,
  volume: number,
): Promise<void> {
  await prepare();
  const p = getPlayer();
  // Re-register status callback so it fires on the new player
  if (_onStatus) {
    if (_statusSubscription) {
      _statusSubscription.remove();
      _statusSubscription = null;
    }
    _statusSubscription = p.addListener('playbackStatusUpdate', handleStatus);
  }
  p.replace(uri);
  p.volume = volume;
  if (shouldPlay) {
    p.play();
  }
}

export async function play(): Promise<void> {
  _player?.play();
}

export async function pause(): Promise<void> {
  _player?.pause();
}

export async function unload(): Promise<void> {
  if (_player) {
    if (_statusSubscription) {
      _statusSubscription.remove();
      _statusSubscription = null;
    }
    _player.remove();
    _player = null;
    _onStatus = null;
  }
}

export async function setPositionAsync(ms: number): Promise<void> {
  await _player?.seekTo(ms / 1000);
}

export async function setVolumeAsync(v: number): Promise<void> {
  if (_player) {
    _player.volume = v;
  }
}

/** Activate lock screen controls and set metadata for the current track. */
export function setLockScreenMetadata(meta: LockScreenMetadata): void {
  const p = getPlayer();
  _lastLockScreenMeta = meta;
  if (!_lockScreenActivated) {
    p.setActiveForLockScreen(
      true,
      {
        title: meta.title,
        artist: meta.artist,
        albumTitle: meta.albumTitle,
        artworkUrl: meta.artworkUrl,
      },
      { showSeekForward: true, showSeekBackward: true },
    );
    _lockScreenActivated = true;
  } else {
    p.updateLockScreenMetadata({
      title: meta.title,
      artist: meta.artist,
      albumTitle: meta.albumTitle,
      artworkUrl: meta.artworkUrl,
    });
  }
}

/** Remove lock screen controls and clear now-playing info. */
export function clearLockScreenControls(): void {
  if (_player && _lockScreenActivated) {
    _player.clearLockScreenControls();
  }
  _lockScreenActivated = false;
  _lastLockScreenMeta = null;
}
