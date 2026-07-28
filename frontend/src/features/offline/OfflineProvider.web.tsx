import React, { createContext, useContext } from 'react';
import type { OfflinePlaylistInput, OfflinePlaylistMeta, OfflineTrackStatus, PlaylistDownloadProgress } from './types';
import type { Track } from '@/hooks/generated/types';

type OfflineContextValue = {
  supported: boolean;
  ready: boolean;
  offlinePlaylistIds: Set<string>;
  trackStatuses: Record<string, OfflineTrackStatus>;
  progressByPlaylist: Record<string, PlaylistDownloadProgress>;
  offlinePlaylists: OfflinePlaylistMeta[];
  isOffline: (playlistId: string) => boolean;
  getTrackStatus: (trackId: string) => OfflineTrackStatus | undefined;
  enableOffline: (input: OfflinePlaylistInput) => Promise<void>;
  disableOffline: (playlistId: string) => Promise<void>;
  reconcileOffline: (input: OfflinePlaylistInput) => Promise<void>;
  getCachedPlaylistTracks: (playlistId: string) => Promise<Track[] | null>;
  refreshOfflinePlaylists: () => Promise<void>;
};

const NOOP_VALUE: OfflineContextValue = {
  supported: false,
  ready: true,
  offlinePlaylistIds: new Set(),
  trackStatuses: {},
  progressByPlaylist: {},
  offlinePlaylists: [],
  isOffline: () => false,
  getTrackStatus: () => undefined,
  enableOffline: async () => {},
  disableOffline: async () => {},
  reconcileOffline: async () => {},
  getCachedPlaylistTracks: async () => null,
  refreshOfflinePlaylists: async () => {},
};

const OfflineContext = createContext<OfflineContextValue>(NOOP_VALUE);

/** Web stub — offline downloads are native-only. */
export function OfflineProvider({ children }: { children: React.ReactNode }) {
  return (
    <OfflineContext.Provider value={NOOP_VALUE}>{children}</OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  return useContext(OfflineContext);
}
