import { ErrorLink } from '@apollo/client/link/error';
import { print } from 'graphql';
import { Observable } from 'rxjs';
import { getGraphQlUrl } from '@/constants/api';
import { RefreshTokenDocument } from '@/hooks/generated';
import { isUnauthenticated } from './errorUtils';

// Single-flight: exactly one refresh request fires no matter how many
// operations fail at once; all concurrent callers await the same attempt.
let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  try {
    const res = await fetch(getGraphQlUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ query: print(RefreshTokenDocument) }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { data?: { refreshToken?: boolean } | null };
    return json.data?.refreshToken === true;
  } catch {
    // Offline / server unreachable — degrade gracefully, don't throw.
    return false;
  }
}

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      // Allow a future refresh after the next access-token expiry.
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const authRefreshLink = new ErrorLink(
  ({ error, operation, forward }) => {
    // Only session expiry triggers a refresh. Network errors (offline) and
    // FORBIDDEN (permissions) propagate untouched.
    if (!isUnauthenticated(error)) return;

    // Never refresh for login (a wrong password is UNAUTHENTICATED but not an
    // expired session), and never retry the same operation twice.
    const { retryCount } = operation.getContext();
    if (operation.operationName === 'Login' || (retryCount ?? 0) >= 1) return;

    operation.setContext({ retryCount: (retryCount ?? 0) + 1 });

    // The handler must return an Observable synchronously, but refreshing is
    // async — so hand back an Observable that awaits the refresh, then either
    // retries the operation (success) or propagates the original error.
    return new Observable((observer) => {
      let sub: { unsubscribe(): void } | undefined;
      refreshAccessToken().then((ok) => {
        if (ok) {
          sub = forward(operation).subscribe(observer);
        } else {
          observer.error(error);
        }
      });
      return () => sub?.unsubscribe();
    });
  },
);
