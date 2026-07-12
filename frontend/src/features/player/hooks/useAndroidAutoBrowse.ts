import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { MyPlaylistsDocument } from '@/hooks/generated';
import { syncAndroidAutoBrowseTree } from '../services/androidAutoBrowse';
import { setupPlayer } from '../utils/AudioManager';

/**
 * Keeps Android Auto's browse tree in sync with My Playlists.
 * No-op on web/iOS. Must render under ApolloProvider + AuthGate.
 */
export function useAndroidAutoBrowse(): void {
  const client = useApolloClient();
  const { data } = useQuery(MyPlaylistsDocument, {
    skip: Platform.OS !== 'android',
  });
  const syncing = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let cancelled = false;

    const run = async () => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        await setupPlayer();
        if (cancelled) return;
        await syncAndroidAutoBrowseTree(client);
      } catch {
        // Browse tree is best-effort; phone playback still works.
      } finally {
        syncing.current = false;
      }
    };

    void run();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [client, data?.myPlaylists]);
}
