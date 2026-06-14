import { Audio, type AVPlaybackStatus } from 'expo-av';
import type { Track } from '@/hooks/generated';
import type { IMusicPlayer, PlayerListener, PlayerState } from '../types/player';

const STREAM_BASE = 'http://localhost:4000/stream';
const SEEK_THRESHOLD_MS = 3000; // if within 3s of start, previous() restarts; otherwise goes to prev track

function buildStreamUrl(filePath: string): string {
  const filename = filePath.split('/').pop() ?? filePath;
  return `${STREAM_BASE}/${encodeURIComponent(filename)}`;
}

/** Default state before any track is loaded */
function defaultState(volume = 0.8): PlayerState {
  return {
    currentTrack: null,
    playlist: [],
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    volume,
  };
}

/**
 * Singleton music player service wrapping expo-av.
 * Manages playback lifecycle, playlist navigation, and state subscriptions.
 * Zero React dependency — can be used from anywhere.
 */
export class MusicPlayerService implements IMusicPlayer {
  private sound: Audio.Sound | null = null;
  private _state: PlayerState = defaultState();
  private playlistIndex = -1;
  private listeners = new Set<PlayerListener>();
  private ready = false;

  /** Current state snapshot */
  get state(): PlayerState {
    return this._state;
  }

  // ---- subscriber management ------------------------------------------------

  subscribe(callback: PlayerListener): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // ---- actions --------------------------------------------------------------

  async play(track: Track): Promise<void> {
    await this.playPlaylist([track], 0);
  }

  async playPlaylist(tracks: Track[], startIndex = 0): Promise<void> {
    if (tracks.length === 0) return;
    const index = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const track = tracks[index];

    this.setState({ isLoading: true });
    await this.loadAndPlay(track);
    this.setState({
      playlist: tracks,
      currentTrack: track,
    });
    this.playlistIndex = index;
  }

  async pause(): Promise<void> {
    if (!this.sound) return;
    await this.sound.pauseAsync();
    this.setState({ isPlaying: false });
  }

  async resume(): Promise<void> {
    if (!this.sound) return;
    await this.sound.playAsync();
    this.setState({ isPlaying: true });
  }

  async togglePlayPause(): Promise<void> {
    if (this._state.isPlaying) {
      await this.pause();
    } else {
      await this.resume();
    }
  }

  async next(): Promise<void> {
    const { playlist } = this._state;
    if (playlist.length === 0) return;
    const nextIndex = (this.playlistIndex + 1) % playlist.length;
    const track = playlist[nextIndex];
    this.setState({ isLoading: true });
    await this.loadAndPlay(track);
    this.setState({ currentTrack: track });
    this.playlistIndex = nextIndex;
  }

  async previous(): Promise<void> {
    const { playlist, position } = this._state;
    if (playlist.length === 0) return;

    // If we're past the threshold, restart current track
    if (position > SEEK_THRESHOLD_MS) {
      await this.seek(0);
      return;
    }

    // Go to previous track (wrap around)
    const prevIndex =
      this.playlistIndex <= 0
        ? playlist.length - 1
        : this.playlistIndex - 1;
    const track = playlist[prevIndex];
    this.setState({ isLoading: true });
    await this.loadAndPlay(track);
    this.setState({ currentTrack: track });
    this.playlistIndex = prevIndex;
  }

  async seek(positionMs: number): Promise<void> {
    if (!this.sound) return;
    await this.sound.setPositionAsync(positionMs);
    this.setState({ position: positionMs });
  }

  async setVolume(value: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, value));
    if (!this.sound) {
      this.setState({ volume: clamped });
      return;
    }
    await this.sound.setVolumeAsync(clamped);
    this.setState({ volume: clamped });
  }

  // ---- internals ------------------------------------------------------------

  private async ensureReady(): Promise<void> {
    if (this.ready) return;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    this.ready = true;
  }

  private async loadAndPlay(track: Track): Promise<void> {
    await this.ensureReady();

    // Unload previous sound
    if (this.sound) {
      try {
        await this.sound.unloadAsync();
      } catch {
        // Ignore — sound may already be unloaded
      }
    }

    const url = buildStreamUrl(track.filePath);
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true, volume: this._state.volume },
      (status: AVPlaybackStatus) => this.onPlaybackStatus(status),
    );

    this.sound = sound;
  }

  private onPlaybackStatus(status: AVPlaybackStatus): void {
    if (!status.isLoaded) {
      // Error state — not much to show yet
      this.setState({ isPlaying: false });
      return;
    }

    const updates: Partial<PlayerState> = {
      isPlaying: status.isPlaying,
      isLoading: status.isBuffering,
      position: status.positionMillis,
      duration: status.durationMillis ?? 0,
      volume: status.volume,
    };

    // If playback finished and we have a playlist, advance
    if (status.didJustFinish && !status.isLooping) {
      this.advanceNext();
      return;
    }

    this.setState(updates);
  }

  private advanceNext(): void {
    const { playlist } = this._state;
    if (playlist.length <= 1) {
      // Single track — just mark as not playing
      this.setState({ isPlaying: false, position: 0 });
      return;
    }
    // Advance to next (async, but we don't await here — fires from callback)
    this.next().catch(() => {
      this.setState({ isPlaying: false });
    });
  }

  private setState(patch: Partial<PlayerState>): void {
    this._state = { ...this._state, ...patch };
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}

/** Global singleton instance */
export const musicPlayer = new MusicPlayerService();
