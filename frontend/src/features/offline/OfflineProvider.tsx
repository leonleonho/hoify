import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isOfflineSupported } from './isOfflineSupported';
import {
  getOfflinePlaylist,
  isPlaylistOffline,
  listOfflinePlaylists,
  loadCatalog,
} from './catalog';
import {
  disableOfflinePlaylist,
  downloadPlaylistTracks,
  hydrateFromCatalog,
  reconcileAndDownload,
} from './downloader';
import type {
  OfflinePlaylistInput,
  OfflinePlaylistMeta,
  OfflineTrackStatus,
  PlaylistDownloadProgress,
} from './types';
import type { Track } from '@/hooks/generated/types';

type TrackStatusMap = Record<string, OfflineTrackStatus>;

type OfflineContextValue = {
  supported: boolean;
  ready: boolean;
  offlinePlaylistIds: Set<string>;
  trackStatuses: TrackStatusMap;
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

const OfflineContext = createContext<OfflineContextValue | null>(null);

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

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const supported = isOfflineSupported();
  const [ready, setReady] = useState(!supported);
  const [offlinePlaylistIds, setOfflinePlaylistIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [trackStatuses, setTrackStatuses] = useState<TrackStatusMap>({});
  const [progressByPlaylist, setProgressByPlaylist] = useState<
    Record<string, PlaylistDownloadProgress>
  >({});
  const [offlinePlaylists, setOfflinePlaylists] = useState<
    OfflinePlaylistMeta[]
  >([]);

  const refreshOfflinePlaylists = useCallback(async () => {
    if (!isOfflineSupported()) return;
    const list = await listOfflinePlaylists();
    setOfflinePlaylists(list);
    setOfflinePlaylistIds(new Set(list.map((p) => p.id)));

    const catalog = await loadCatalog();
    const statuses: TrackStatusMap = {};
    for (const [trackId, audio] of Object.entries(catalog.audio)) {
      if (audio.uri) statuses[trackId] = 'ready';
    }
    setTrackStatuses((prev) => ({ ...statuses, ...prev, ...statuses }));
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      try {
        await hydrateFromCatalog();
        if (cancelled) return;
        await refreshOfflinePlaylists();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, refreshOfflinePlaylists]);

  const setTrackStatus = useCallback(
    (trackId: string, status: OfflineTrackStatus) => {
      setTrackStatuses((prev) => {
        if (prev[trackId] === status) return prev;
        return { ...prev, [trackId]: status };
      });
    },
    [],
  );

  const setProgress = useCallback((progress: PlaylistDownloadProgress) => {
    setProgressByPlaylist((prev) => ({
      ...prev,
      [progress.playlistId]: progress,
    }));
  }, []);

  const enableOffline = useCallback(
    async (input: OfflinePlaylistInput) => {
      if (!isOfflineSupported()) return;
      setOfflinePlaylistIds((prev) => new Set([...prev, input.id]));
      const pending: TrackStatusMap = {};
      for (const t of input.tracks) {
        pending[t.id] = 'pending';
      }
      setTrackStatuses((prev) => ({ ...prev, ...pending }));
      await downloadPlaylistTracks(input, {
        onTrackStatus: setTrackStatus,
        onProgress: setProgress,
      });
      await refreshOfflinePlaylists();
    },
    [refreshOfflinePlaylists, setProgress, setTrackStatus],
  );

  const disableOffline = useCallback(
    async (playlistId: string) => {
      if (!isOfflineSupported()) return;
      await disableOfflinePlaylist(playlistId);
      setProgressByPlaylist((prev) => {
        const next = { ...prev };
        delete next[playlistId];
        return next;
      });
      await refreshOfflinePlaylists();
      // Drop statuses for tracks no longer in any offline playlist
      const catalog = await loadCatalog();
      setTrackStatuses((prev) => {
        const next: TrackStatusMap = {};
        for (const [id, status] of Object.entries(prev)) {
          if (catalog.audio[id]) next[id] = 'ready';
          else if (status === 'downloading' || status === 'pending') {
            // keep transient only if still referenced — cleared
          }
        }
        return next;
      });
    },
    [refreshOfflinePlaylists],
  );

  const reconcileOffline = useCallback(
    async (input: OfflinePlaylistInput) => {
      if (!isOfflineSupported()) return;
      const marked = await isPlaylistOffline(input.id);
      if (!marked) return;
      await reconcileAndDownload(input, {
        onTrackStatus: setTrackStatus,
        onProgress: setProgress,
      });
      await refreshOfflinePlaylists();
    },
    [refreshOfflinePlaylists, setProgress, setTrackStatus],
  );

  const getCachedPlaylistTracks = useCallback(
    async (playlistId: string): Promise<Track[] | null> => {
      const result = await getOfflinePlaylist(playlistId);
      return result?.tracks ?? null;
    },
    [],
  );

  const isOffline = useCallback(
    (playlistId: string) => offlinePlaylistIds.has(playlistId),
    [offlinePlaylistIds],
  );

  const getTrackStatus = useCallback(
    (trackId: string) => trackStatuses[trackId],
    [trackStatuses],
  );

  const value = useMemo<OfflineContextValue>(
    () => ({
      supported,
      ready,
      offlinePlaylistIds,
      trackStatuses,
      progressByPlaylist,
      offlinePlaylists,
      isOffline,
      getTrackStatus,
      enableOffline,
      disableOffline,
      reconcileOffline,
      getCachedPlaylistTracks,
      refreshOfflinePlaylists,
    }),
    [
      supported,
      ready,
      offlinePlaylistIds,
      trackStatuses,
      progressByPlaylist,
      offlinePlaylists,
      isOffline,
      getTrackStatus,
      enableOffline,
      disableOffline,
      reconcileOffline,
      getCachedPlaylistTracks,
      refreshOfflinePlaylists,
    ],
  );

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  return ctx ?? NOOP_VALUE;
}
