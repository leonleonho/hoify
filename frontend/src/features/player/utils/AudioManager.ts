import { Audio, type AVPlaybackStatus } from 'expo-av';

/**
 * Module-level singleton owning a single expo-av Sound instance.
 *
 * The Sound instance survives React remount cycles caused by browser
 * history navigation (popstate → resetRoot). The underlying HTMLAudioElement
 * stays alive in the DOM even when PlayerProvider unmounts/remounts.
 *
 * Usage: call load() to load/reload a track, then pause/resume/setPosition
 * as needed. Unload is explicit — never automatic on cleanup.
 */

let _sound: Audio.Sound | null = null;
let _onStatus: StatusCallback | null = null;

type StatusCallback = (status: AVPlaybackStatus) => void;

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

function getSound(): Audio.Sound {
  if (!_sound) {
    _sound = new Audio.Sound();
  }
  return _sound;
}

/** Returns true when the singleton has been loaded at least once. */
export function hasActiveSound(): boolean {
  return _sound !== null;
}

/** Register a status callback. Set null to clear. */
export function setOnStatus(cb: StatusCallback | null): void {
  _onStatus = cb;
  if (_sound && cb) {
    _sound.setOnPlaybackStatusUpdate(cb);
  }
}

function handleStatus(status: AVPlaybackStatus): void {
  _onStatus?.(status);
}

export async function ensureAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
}

async function prepare(): Promise<void> {
  await ensureAudioMode();
  const s = _sound;
  if (s) {
    // Reuse existing sound — unload first so loadAsync can be called again
    try { await s.unloadAsync(); } catch { /* ignore */ }
  }
}

export async function load(
  uri: string,
  shouldPlay: boolean,
  volume: number,
): Promise<void> {
  await prepare();
  const s = getSound();
  // Register status callback first so it fires on load
  s.setOnPlaybackStatusUpdate(handleStatus);
  await s.loadAsync({ uri }, { shouldPlay, volume });
}

export async function play(): Promise<void> {
  await _sound?.playAsync();
}

export async function pause(): Promise<void> {
  await _sound?.pauseAsync();
}

export async function unload(): Promise<void> {
  if (_sound) {
    try { await _sound.unloadAsync(); } catch { /* ignore */ }
    _sound = null;
    _onStatus = null;
  }
}

export async function setPositionAsync(ms: number): Promise<void> {
  await _sound?.setPositionAsync(ms);
}

export async function setVolumeAsync(v: number): Promise<void> {
  await _sound?.setVolumeAsync(v);
}
