import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useOfflineMode } from '../hooks/useOfflineMode';

/** Routes reachable while offline. Index/home is intentionally excluded. */
const OFFLINE_ALLOWED_ROOTS = new Set(['offline', 'playlist', 'player']);

function isAllowedOfflineRoute(segments: string[]): boolean {
  const root = segments[0];
  return Boolean(root && OFFLINE_ALLOWED_ROOTS.has(root));
}

/**
 * When offline, keep the user on offline-friendly routes only.
 * Sends `/` and browse screens to `/offline`; returns to `/` when back online.
 */
export function OfflineModeRedirect() {
  const { offlineMode, checking } = useOfflineMode();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (checking) return;

    if (offlineMode) {
      if (!isAllowedOfflineRoute(segments)) {
        router.replace('/offline' as any);
      }
      return;
    }

    if (segments[0] === 'offline') {
      router.replace('/' as any);
    }
  }, [offlineMode, checking, segments, router]);

  return null;
}
