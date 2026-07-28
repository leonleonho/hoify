import { getApiBase } from '@/constants/api';
import type { PlayerQuality } from '@/features/player/types/player';
import { getLocalUri } from './localUriIndex';

export function buildStreamUrl(
  trackId: string,
  quality: PlayerQuality,
  seek?: number,
): string {
  let url = `${getApiBase()}/stream/${encodeURIComponent(trackId)}?quality=${quality}`;
  if (seek && quality !== 'original') {
    url += `&seek=${Math.floor(seek / 1000)}`;
  }
  return url;
}

/**
 * Prefer a locally downloaded file when present; otherwise stream from the server.
 * Safe to call on web (always returns stream URL).
 */
export function resolveTrackUrl(
  trackId: string,
  quality: PlayerQuality,
  seek?: number,
): string {
  const local = getLocalUri(trackId);
  if (local) return local;
  return buildStreamUrl(trackId, quality, seek);
}
