import type { Track } from '@/hooks/generated/types';

export type OfflineTrackStatus = 'pending' | 'downloading' | 'ready' | 'error';

export type OfflinePlaylistMeta = {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  type?: string | null;
  trackCount: number;
  trackIds: string[];
};

export type OfflineAudioEntry = {
  /** File extension without dot, e.g. "mp3" */
  ext: string;
  /** Absolute file:// URI */
  uri: string;
  /** Playlists that reference this track for offline */
  playlistIds: string[];
};

export type OfflineCatalog = {
  version: 1;
  playlists: Record<string, OfflinePlaylistMeta>;
  tracks: Record<string, Track>;
  audio: Record<string, OfflineAudioEntry>;
};

export type PlaylistDownloadProgress = {
  playlistId: string;
  done: number;
  total: number;
  /** True while a download pass is actively running */
  active: boolean;
};

export type OfflinePlaylistInput = {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  type?: string | null;
  trackCount: number;
  tracks: Track[];
};
