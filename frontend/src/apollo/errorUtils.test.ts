import { describe, expect, it } from 'vitest';
import { isAuthError, isNetworkError } from './errorUtils';

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
});
