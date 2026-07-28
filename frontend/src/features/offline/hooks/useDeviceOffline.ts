import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

function netInfoSaysOffline(state: NetInfoState): boolean {
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}

/**
 * Device-level connectivity. `null` until the first NetInfo read completes.
 * On web, uses `navigator.onLine`.
 */
export function useDeviceOffline(): boolean | null {
  const [offline, setOffline] = useState<boolean | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined') {
        setOffline(false);
        return;
      }
      const sync = () => setOffline(!navigator.onLine);
      sync();
      window.addEventListener('online', sync);
      window.addEventListener('offline', sync);
      return () => {
        window.removeEventListener('online', sync);
        window.removeEventListener('offline', sync);
      };
    }

    let cancelled = false;
    const apply = (state: NetInfoState) => {
      if (!cancelled) setOffline(netInfoSaysOffline(state));
    };

    const unsub = NetInfo.addEventListener(apply);
    NetInfo.fetch().then(apply).catch(() => {
      if (!cancelled) setOffline(false);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return offline;
}
