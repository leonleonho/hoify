import { isOfflineSupported } from './isOfflineSupported';
import { catalogFile, ensureOfflineDirs } from './audioStore';
import type {
  OfflineCatalog,
  OfflinePlaylistInput,
  OfflinePlaylistMeta,
} from './types';
import type { Track } from '@/hooks/generated/types';

const EMPTY_CATALOG: OfflineCatalog = {
  version: 1,
  playlists: {},
  tracks: {},
  audio: {},
};

let cached: OfflineCatalog | null = null;

function cloneEmpty(): OfflineCatalog {
  return {
    version: 1,
    playlists: {},
    tracks: {},
    audio: {},
  };
}

export async function loadCatalog(): Promise<OfflineCatalog> {
  if (!isOfflineSupported()) {
    cached = cloneEmpty();
    return cached;
  }
  if (cached) return cached;

  ensureOfflineDirs();
  const file = catalogFile();
  if (!file.exists) {
    cached = cloneEmpty();
    return cached;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as OfflineCatalog;
    if (parsed?.version !== 1 || !parsed.playlists || !parsed.tracks || !parsed.audio) {
      cached = cloneEmpty();
      return cached;
    }
    cached = parsed;
    return cached;
  } catch {
    cached = cloneEmpty();
    return cached;
  }
}

export async function saveCatalog(catalog: OfflineCatalog): Promise<void> {
  if (!isOfflineSupported()) return;
  ensureOfflineDirs();
  const file = catalogFile();
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  file.write(JSON.stringify(catalog));
  cached = catalog;
}

export function getCachedCatalog(): OfflineCatalog | null {
  return cached;
}

/** Reset in-memory cache (tests). */
export function _resetCatalogCacheForTests(): void {
  cached = null;
}

export async function listOfflinePlaylists(): Promise<OfflinePlaylistMeta[]> {
  const catalog = await loadCatalog();
  return Object.values(catalog.playlists);
}

export async function getOfflinePlaylist(
  playlistId: string,
): Promise<{ playlist: OfflinePlaylistMeta; tracks: Track[] } | null> {
  const catalog = await loadCatalog();
  const playlist = catalog.playlists[playlistId];
  if (!playlist) return null;
  const tracks = playlist.trackIds
    .map((id) => catalog.tracks[id])
    .filter((t): t is Track => Boolean(t));
  return { playlist, tracks };
}

export async function isPlaylistOffline(playlistId: string): Promise<boolean> {
  const catalog = await loadCatalog();
  return Boolean(catalog.playlists[playlistId]);
}

/**
 * Upsert playlist + tracks into the catalog. Adds playlistId to audio
 * refcounts for tracks that already have audio entries.
 */
export async function upsertOfflinePlaylist(
  input: OfflinePlaylistInput,
): Promise<OfflineCatalog> {
  const catalog = await loadCatalog();
  const trackIds = input.tracks.map((t) => t.id);

  catalog.playlists[input.id] = {
    id: input.id,
    name: input.name,
    description: input.description ?? null,
    isPublic: input.isPublic,
    type: input.type ?? null,
    trackCount: input.trackCount,
    trackIds,
  };

  for (const track of input.tracks) {
    catalog.tracks[track.id] = track;
    const audio = catalog.audio[track.id];
    if (audio && !audio.playlistIds.includes(input.id)) {
      audio.playlistIds = [...audio.playlistIds, input.id];
    }
  }

  await saveCatalog(catalog);
  return catalog;
}

/** Record that a track file is on disk and referenced by playlistId. */
export async function markAudioReady(
  trackId: string,
  ext: string,
  uri: string,
  playlistId: string,
): Promise<void> {
  const catalog = await loadCatalog();
  const existing = catalog.audio[trackId];
  const playlistIds = existing?.playlistIds ?? [];
  if (!playlistIds.includes(playlistId)) {
    playlistIds.push(playlistId);
  }
  catalog.audio[trackId] = { ext, uri, playlistIds };
  await saveCatalog(catalog);
}

/**
 * Remove a playlist from offline. Returns track ids whose audio should be
 * deleted (refcount hit zero).
 */
export async function removeOfflinePlaylist(
  playlistId: string,
): Promise<string[]> {
  const catalog = await loadCatalog();
  const playlist = catalog.playlists[playlistId];
  if (!playlist) return [];

  delete catalog.playlists[playlistId];

  const toDelete: string[] = [];
  for (const trackId of playlist.trackIds) {
    const audio = catalog.audio[trackId];
    if (!audio) continue;
    audio.playlistIds = audio.playlistIds.filter((id) => id !== playlistId);
    if (audio.playlistIds.length === 0) {
      delete catalog.audio[trackId];
      // Keep track metadata only if another offline playlist still needs it
      const stillNeeded = Object.values(catalog.playlists).some((p) =>
        p.trackIds.includes(trackId),
      );
      if (!stillNeeded) {
        delete catalog.tracks[trackId];
      }
      toDelete.push(trackId);
    }
  }

  // Drop track metadata for tracks no longer referenced
  for (const trackId of playlist.trackIds) {
    const stillNeeded = Object.values(catalog.playlists).some((p) =>
      p.trackIds.includes(trackId),
    );
    if (!stillNeeded && !catalog.audio[trackId]) {
      delete catalog.tracks[trackId];
    }
  }

  await saveCatalog(catalog);
  return toDelete;
}

/**
 * After playlist track list changes: drop refs for removed tracks, return
 * track ids to delete from disk.
 */
export async function reconcilePlaylistTracks(
  playlistId: string,
  input: OfflinePlaylistInput,
): Promise<{ removedTrackIds: string[]; catalog: OfflineCatalog }> {
  const catalog = await loadCatalog();
  const prev = catalog.playlists[playlistId];
  const prevIds = new Set(prev?.trackIds ?? []);
  const nextIds = new Set(input.tracks.map((t) => t.id));

  const removedTrackIds: string[] = [];
  for (const trackId of prevIds) {
    if (nextIds.has(trackId)) continue;
    const audio = catalog.audio[trackId];
    if (audio) {
      audio.playlistIds = audio.playlistIds.filter((id) => id !== playlistId);
      if (audio.playlistIds.length === 0) {
        delete catalog.audio[trackId];
        removedTrackIds.push(trackId);
      }
    }
    const stillNeeded = Object.values(catalog.playlists).some(
      (p) => p.id !== playlistId && p.trackIds.includes(trackId),
    );
    if (!stillNeeded && !catalog.audio[trackId]) {
      delete catalog.tracks[trackId];
    }
  }

  await saveCatalog(catalog);
  const updated = await upsertOfflinePlaylist(input);
  return { removedTrackIds, catalog: updated };
}

export { EMPTY_CATALOG };
