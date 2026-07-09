import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { artUrl } from '@/constants/api';
import type { Track } from '@/hooks/generated/types';

export interface MediaSessionActions {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  nexttrack: () => Promise<void>;
  previoustrack: () => Promise<void>;
  seekto: (positionMs: number) => Promise<void>;
}

/**
 * Synchronises HTML Media Session API (navigator.mediaSession)
 * with the app's player state, so browser lock-screen / system tray
 * shows correct metadata and transport controls work.
 *
 * No-op on native platforms — expo-av handles those natively.
 */
export function useMediaSession(
  currentTrack: Track | null,
  isPlaying: boolean,
  actions: MediaSessionActions,
): void {
  const supported =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    'mediaSession' in navigator;

  // Keep latest callbacks in a ref so action handlers don't go stale
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Register action handlers once on mount, clean up on unmount
  useEffect(() => {
    if (!supported) return;

    const ms = navigator.mediaSession;

    const call = (cb: () => Promise<void>) => {
      cb().catch(() => {});
    };

    ms.setActionHandler('play', () => call(actionsRef.current.play));
    ms.setActionHandler('pause', () => call(actionsRef.current.pause));
    ms.setActionHandler('nexttrack', () => call(actionsRef.current.nexttrack));
    ms.setActionHandler('previoustrack', () => call(actionsRef.current.previoustrack));
    ms.setActionHandler('seekto', (details) => {
      const st = details.seekTime;
      if (st != null) {
        call(() => actionsRef.current.seekto(Math.round(st * 1000)));
      }
    });

    return () => {
      // Unregister all handlers on unmount
      const actions: MediaSessionAction[] = [
        'play', 'pause', 'nexttrack', 'previoustrack', 'seekto',
      ];
      actions.forEach((a) => {
        try { ms.setActionHandler(a, null); } catch { /* noop */ }
      });
    };
  }, [supported]);

  // Update metadata whenever the current track changes
  useEffect(() => {
    if (!supported) return;

    const ms = navigator.mediaSession;

    if (!currentTrack) {
      ms.metadata = null;
      ms.playbackState = 'none';
      return;
    }

    const artwork: MediaImage[] = [];
    if (currentTrack.album.coverUrl) {
      const url = artUrl(currentTrack.album.coverUrl);
      if (url) {
        artwork.push({ src: url, sizes: '512x512', type: 'image/jpeg' });
      }
    }

    ms.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.trackArtist ?? currentTrack.album.artist.name,
      album: currentTrack.album.title,
      artwork,
    });

    ms.playbackState = isPlaying ? 'playing' : 'paused';
  }, [supported, currentTrack, isPlaying]);
}
