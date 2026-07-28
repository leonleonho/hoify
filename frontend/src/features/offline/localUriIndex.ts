/**
 * In-memory map of trackId → local file URI for sync queue building.
 * Hydrated from the catalog on OfflineProvider mount and updated after downloads.
 */

const localUris = new Map<string, string>();

export function setLocalUri(trackId: string, uri: string): void {
  localUris.set(trackId, uri);
}

export function removeLocalUri(trackId: string): void {
  localUris.delete(trackId);
}

export function getLocalUri(trackId: string): string | null {
  return localUris.get(trackId) ?? null;
}

export function hydrateLocalUris(entries: Record<string, { uri: string }>): void {
  localUris.clear();
  for (const [trackId, entry] of Object.entries(entries)) {
    if (entry.uri) localUris.set(trackId, entry.uri);
  }
}

export function clearLocalUris(): void {
  localUris.clear();
}
