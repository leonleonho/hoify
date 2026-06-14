import type { Track } from '@/hooks/generated';

/** Playback state exposed to the UI. Read-only snapshot. */
export type PlayerState = {
  /** The track currently loaded (or null if nothing loaded) */
  currentTrack: Track | null;
  /** Upcoming tracks */
  playlist: Track[];
  /** Whether audio is actively playing */
  isPlaying: boolean;
  /** Whether audio is buffering/loading */
  isLoading: boolean;
  /** Current playback position in milliseconds */
  position: number;
  /** Total duration in milliseconds (0 if unknown) */
  duration: number;
  /** Volume level 0–1 */
  volume: number;
};

/** Actions the service exposes */
export interface IMusicPlayer {
  readonly state: PlayerState;

  /** Load a single track without playing */
  load(track: Track): Promise<void>;
  /** Load and play a single track (replaces playlist) */
  play(track: Track): Promise<void>;
  /** Load and play a playlist starting at the given index */
  playPlaylist(tracks: Track[], startIndex?: number): Promise<void>;
  /** Pause current track */
  pause(): Promise<void>;
  /** Resume paused track */
  resume(): Promise<void>;
  /** Toggle between play and pause */
  togglePlayPause(): Promise<void>;
  /** Skip to next track in playlist */
  next(): Promise<void>;
  /** Skip to previous track (or restart current if > 3s in) */
  previous(): Promise<void>;
  /** Seek to a position in milliseconds */
  seek(positionMs: number): Promise<void>;
  /** Set volume 0–1 */
  setVolume(value: number): Promise<void>;

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(callback: () => void): () => void;
}

export type PlayerListener = () => void;
