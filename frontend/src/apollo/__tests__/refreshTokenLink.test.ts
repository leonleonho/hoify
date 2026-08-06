import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';
import type { ApolloLink } from '@apollo/client/link';
import { createOperation } from '@apollo/client/link/utils';
import { firstValueFrom, Observable } from 'rxjs';
import type { DocumentNode } from 'graphql';
import { authRefreshLink } from '../refreshTokenLink';

type Result = ApolloLink.Result;

const UNAUTHENTICATED_RESULT: Result = {
  errors: [
    {
      message: 'Authentication required',
      extensions: { code: 'UNAUTHENTICATED' },
    },
  ],
};

const OK_RESULT: Result = { data: { me: { id: '1' } } };

function fetchMock(ok: boolean) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: { refreshToken: ok } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

// ErrorLink reads operation.client.queryManager.incrementalHandler to detect
// incremental results — stub it so plain results flow through.
const stubClient = {
  queryManager: {
    incrementalHandler: {
      isIncrementalResult: () => false,
      extractErrors: () => undefined,
    },
  },
} as never;

function op(query: DocumentNode) {
  return createOperation({ query }, { client: stubClient });
}

function opNamed(name: string) {
  return op(gql`query ${name} { x }`);
}

/** forward that emits UNAUTHENTICATED on the first call, then `after` on retries. */
function forwardingSequence(after: () => Result) {
  let calls = 0;
  return {
    forward: () =>
      new Observable<Result>((observer) => {
        calls += 1;
        if (calls === 1) {
          observer.next(UNAUTHENTICATED_RESULT);
        } else {
          observer.next(after());
          observer.complete();
        }
      }),
    callCount: () => calls,
  };
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock(true));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authRefreshLink', () => {
  it('refreshes once and retries when several operations fail concurrently', async () => {
    const a = forwardingSequence(() => OK_RESULT);
    const b = forwardingSequence(() => OK_RESULT);

    const results = await Promise.all([
      firstValueFrom(authRefreshLink.request(opNamed('A'), a.forward)!),
      firstValueFrom(authRefreshLink.request(opNamed('B'), b.forward)!),
    ]);

    expect(results).toEqual([OK_RESULT, OK_RESULT]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(a.callCount()).toBe(2);
    expect(b.callCount()).toBe(2);
  });

  it('retries a failed operation at most once', async () => {
    const { forward, callCount } = forwardingSequence(() => UNAUTHENTICATED_RESULT);

    const result = await firstValueFrom(authRefreshLink.request(opNamed('Foo'), forward)!);

    // Retried op fails again → error result propagates, no second refresh.
    expect(result).toHaveProperty('errors');
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(callCount()).toBe(2);
  });

  it('does not refresh on network errors', async () => {
    const forward = () =>
      new Observable<Result>((observer) => {
        observer.error(new Error('Network request failed'));
      });

    await expect(firstValueFrom(authRefreshLink.request(opNamed('Foo'), forward)!)).rejects.toThrow(
      'Network request failed',
    );
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('does not refresh for the Login operation', async () => {
    const forward = () =>
      new Observable<Result>((observer) => {
        observer.next(UNAUTHENTICATED_RESULT);
      });

    const result = await firstValueFrom(authRefreshLink.request(opNamed('Login'), forward)!);

    expect(result).toHaveProperty('errors');
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('propagates the original error when refresh fails', async () => {
    vi.stubGlobal('fetch', fetchMock(false));
    const { forward, callCount } = forwardingSequence(() => OK_RESULT);

    await expect(firstValueFrom(authRefreshLink.request(opNamed('Foo'), forward)!)).rejects.toMatchObject(
      { message: 'Authentication required' },
    );
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(callCount()).toBe(1);
  });
});
