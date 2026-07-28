import { useQuery } from '@apollo/client/react';
import { isAuthError, isNetworkError } from '@/apollo/errorUtils';
import { MeDocument } from '@/hooks/generated';
import { useDeviceOffline } from './useDeviceOffline';

/**
 * True when the device is offline or the API is unreachable.
 * Uses NetInfo (not just GraphQL errors) so cached auth doesn't mask airplane mode.
 */
export function useOfflineMode(): {
  offlineMode: boolean;
  checking: boolean;
} {
  const deviceOffline = useDeviceOffline();
  const { loading, error } = useQuery(MeDocument, {
    errorPolicy: 'all',
  });

  const apiUnreachable =
    Boolean(error) && isNetworkError(error) && !isAuthError(error);

  const offlineMode = deviceOffline === true || apiUnreachable;

  return {
    offlineMode,
    checking: deviceOffline === null || (loading && !offlineMode),
  };
}
