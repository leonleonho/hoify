import type { Track } from '@/hooks/generated/types';

export type PlayerQuality = 'original' | 'high' | 'medium' | 'low';

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
  /** Stream quality: original (passthrough), high (320k), medium (160k), low (96k) */
  quality: PlayerQuality;
};
