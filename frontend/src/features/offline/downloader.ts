import { File } from 'expo-file-system';
import { getApiBase } from '@/constants/api';
import { isOfflineSupported } from './isOfflineSupported';
import {
  audioFile,
  deleteAudioFile,
  ensureOfflineDirs,
  extensionFromFilePath,
  findAudioFile,
} from './audioStore';
import {
  loadCatalog,
  markAudioReady,
  reconcilePlaylistTracks,
  removeOfflinePlaylist,
  upsertOfflinePlaylist,
} from './catalog';
import { hydrateLocalUris, removeLocalUri, setLocalUri } from './localUriIndex';
import type {
  OfflinePlaylistInput,
  OfflineTrackStatus,
  PlaylistDownloadProgress,
} from './types';

export type DownloadCallbacks = {
  onTrackStatus?: (trackId: string, status: OfflineTrackStatus) => void;
  onProgress?: (progress: PlaylistDownloadProgress) => void;
};

const activeControllers = new Map<string, AbortController>();

function streamDownloadUrl(trackId: string): string {
  return `${getApiBase()}/stream/${encodeURIComponent(trackId)}?quality=original`;
}

async function downloadOneTrack(
  trackId: string,
  ext: string,
  playlistId: string,
  signal: AbortSignal,
): Promise<string> {
  ensureOfflineDirs();

  const existing = findAudioFile(trackId);
  if (existing?.exists) {
    const uri = existing.uri;
    await markAudioReady(trackId, ext, uri, playlistId);
    setLocalUri(trackId, uri);
    return uri;
  }

  const dest = audioFile(trackId, ext);
  const url = streamDownloadUrl(trackId);
  const downloaded = await File.downloadFileAsync(url, dest, {
    signal,
    idempotent: true,
  });
  const uri = downloaded.uri;
  await markAudioReady(trackId, ext, uri, playlistId);
  setLocalUri(trackId, uri);
  return uri;
}

/**
 * Download all missing tracks for a playlist. Updates catalog + local URI index.
 * Safe to call repeatedly (skips tracks already on disk).
 */
export async function downloadPlaylistTracks(
  input: OfflinePlaylistInput,
  callbacks: DownloadCallbacks = {},
): Promise<void> {
  if (!isOfflineSupported()) return;

  const { playlistId } = { playlistId: input.id };
  activeControllers.get(playlistId)?.abort();
  const controller = new AbortController();
  activeControllers.set(playlistId, controller);

  await upsertOfflinePlaylist(input);

  const tracks = input.tracks;
  const total = tracks.length;
  let done = 0;

  // Count already-ready tracks
  const catalog = await loadCatalog();
  for (const track of tracks) {
    if (catalog.audio[track.id]?.uri || findAudioFile(track.id)?.exists) {
      done += 1;
      callbacks.onTrackStatus?.(track.id, 'ready');
    } else {
      callbacks.onTrackStatus?.(track.id, 'pending');
    }
  }

  callbacks.onProgress?.({ playlistId, done, total, active: true });

  try {
    for (const track of tracks) {
      if (controller.signal.aborted) break;

      const already =
        catalog.audio[track.id]?.uri || findAudioFile(track.id)?.exists;
      if (already) {
        const uri =
          catalog.audio[track.id]?.uri ?? findAudioFile(track.id)!.uri;
        setLocalUri(track.id, uri);
        await markAudioReady(
          track.id,
          catalog.audio[track.id]?.ext ??
            extensionFromFilePath(track.filePath),
          uri,
          playlistId,
        );
        callbacks.onTrackStatus?.(track.id, 'ready');
        continue;
      }

      callbacks.onTrackStatus?.(track.id, 'downloading');
      const ext = extensionFromFilePath(track.filePath);
      try {
        await downloadOneTrack(track.id, ext, playlistId, controller.signal);
        done += 1;
        callbacks.onTrackStatus?.(track.id, 'ready');
        callbacks.onProgress?.({ playlistId, done, total, active: true });
      } catch (err) {
        if (controller.signal.aborted) break;
        console.warn('[offline] download failed', track.id, err);
        callbacks.onTrackStatus?.(track.id, 'error');
        callbacks.onProgress?.({ playlistId, done, total, active: true });
      }
    }
  } finally {
    if (activeControllers.get(playlistId) === controller) {
      activeControllers.delete(playlistId);
    }
    callbacks.onProgress?.({
      playlistId,
      done,
      total,
      active: false,
    });
  }
}

/** Reconcile playlist contents then download any missing tracks. */
export async function reconcileAndDownload(
  input: OfflinePlaylistInput,
  callbacks: DownloadCallbacks = {},
): Promise<void> {
  if (!isOfflineSupported()) return;
  const { removedTrackIds } = await reconcilePlaylistTracks(input.id, input);
  for (const trackId of removedTrackIds) {
    deleteAudioFile(trackId);
    removeLocalUri(trackId);
  }
  await downloadPlaylistTracks(input, callbacks);
}

export async function disableOfflinePlaylist(
  playlistId: string,
): Promise<void> {
  if (!isOfflineSupported()) return;
  activeControllers.get(playlistId)?.abort();
  activeControllers.delete(playlistId);
  const toDelete = await removeOfflinePlaylist(playlistId);
  for (const trackId of toDelete) {
    deleteAudioFile(trackId);
    removeLocalUri(trackId);
  }
}

/** Hydrate local URI index from catalog audio entries. */
export async function hydrateFromCatalog(): Promise<void> {
  if (!isOfflineSupported()) return;
  const catalog = await loadCatalog();
  hydrateLocalUris(catalog.audio);
  // Prefer on-disk URI if the catalog path is stale
  for (const [trackId] of Object.entries(catalog.audio)) {
    const file = findAudioFile(trackId);
    if (file?.exists) {
      setLocalUri(trackId, file.uri);
    }
  }
}

export function abortPlaylistDownload(playlistId: string): void {
  activeControllers.get(playlistId)?.abort();
  activeControllers.delete(playlistId);
}
