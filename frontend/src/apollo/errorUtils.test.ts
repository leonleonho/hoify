import { describe, expect, it } from 'vitest';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { isAuthError, isNetworkError, isUnauthenticated } from './errorUtils';

const graphQLErrors = (code: string) =>
  new CombinedGraphQLErrors({
    errors: [{ message: 'op failed', extensions: { code } }],
  });

describe('isNetworkError', () => {
  it('detects networkError field', () => {
    expect(isNetworkError({ networkError: new Error('fetch failed') })).toBe(true);
  });

  it('detects common offline messages', () => {
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
  });

  it('returns false for GraphQL auth errors', () => {
    expect(
      isNetworkError({
        graphQLErrors: [
          { message: 'Authentication required', extensions: { code: 'UNAUTHENTICATED' } },
        ],
      }),
    ).toBe(false);
  });
});

describe('isAuthError', () => {
  it('detects UNAUTHENTICATED GraphQL errors', () => {
    expect(
      isAuthError({
        graphQLErrors: [
          { message: 'Authentication required', extensions: { code: 'UNAUTHENTICATED' } },
        ],
      }),
    ).toBe(true);
  });

  it('returns false for network failures', () => {
    expect(isAuthError({ networkError: new Error('Network request failed') })).toBe(
      false,
    );
  });

  it('detects UNAUTHENTICATED on CombinedGraphQLErrors (Apollo v4 runtime shape)', () => {
    expect(isAuthError(graphQLErrors('UNAUTHENTICATED'))).toBe(true);
  });

  it('detects FORBIDDEN on CombinedGraphQLErrors', () => {
    expect(isAuthError(graphQLErrors('FORBIDDEN'))).toBe(true);
  });

  it('detects HTTP 401 via ServerError', () => {
    expect(isAuthError(new ServerError('Unauthorized', {
      response: new Response(null, { status: 401 }),
      bodyText: '',
    }))).toBe(true);
  });
});

describe('isUnauthenticated', () => {
  it('detects UNAUTHENTICATED GraphQL errors', () => {
    expect(
      isUnauthenticated({
        graphQLErrors: [
          { message: 'Authentication required', extensions: { code: 'UNAUTHENTICATED' } },
        ],
      }),
    ).toBe(true);
  });

  it('detects UNAUTHENTICATED on CombinedGraphQLErrors', () => {
    expect(isUnauthenticated(graphQLErrors('UNAUTHENTICATED'))).toBe(true);
  });

  it('detects HTTP 401 via ServerError', () => {
    expect(isUnauthenticated(new ServerError('Unauthorized', {
      response: new Response(null, { status: 401 }),
      bodyText: '',
    }))).toBe(true);
  });

  it('excludes FORBIDDEN', () => {
    expect(isUnauthenticated(graphQLErrors('FORBIDDEN'))).toBe(false);
    expect(
      isUnauthenticated({
        graphQLErrors: [{ extensions: { code: 'FORBIDDEN' } }],
      }),
    ).toBe(false);
  });

  it('returns false for network failures', () => {
    expect(isUnauthenticated({ networkError: new Error('Network request failed') })).toBe(
      false,
    );
  });
});
