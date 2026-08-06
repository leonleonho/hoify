import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';

type ApolloErrorLike = {
  message?: string;
  networkError?: unknown;
  graphQLErrors?: GraphQLErrorsLike[];
};

// GraphQLFormattedError.extensions is `Record<string, unknown>`.
type GraphQLErrorsLike = {
  message?: string;
  extensions?: Record<string, unknown>;
};

function asApolloError(error: unknown): ApolloErrorLike | null {
  if (!error || typeof error !== 'object') return null;
  return error as ApolloErrorLike;
}

/** True when any GraphQL error carries one of the given extension codes. */
function hasGraphQLErrorCode(error: unknown, codes: string[]): boolean {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.some((e) => {
      const code = e.extensions?.code;
      return typeof code === 'string' && codes.includes(code);
    });
  }
  const apollo = asApolloError(error);
  return (
    apollo?.graphQLErrors?.some((e) => {
      const code = e.extensions?.code;
      return typeof code === 'string' && codes.includes(code);
    }) ?? false
  );
}

/** True when the HTTP response carried one of the given status codes. */
function hasHttpStatus(error: unknown, statuses: number[]): boolean {
  if (ServerError.is(error)) {
    return statuses.includes(error.statusCode);
  }
  const apollo = asApolloError(error);
  const status = (apollo?.networkError as { statusCode?: number } | undefined)
    ?.statusCode;
  return status !== undefined && statuses.includes(status);
}

/** True when the request never reached the server (offline, timeout, DNS, etc.). */
export function isNetworkError(error: unknown): boolean {
  // A server response (even one with GraphQL errors) is not a network failure.
  if (CombinedGraphQLErrors.is(error)) return false;

  const apollo = asApolloError(error);
  if (apollo?.networkError) return true;

  const message = apollo?.message ?? (error instanceof Error ? error.message : String(error));

  return /network request failed|failed to fetch|network error|load failed|timeout|ENOTFOUND|ECONNREFUSED|ERR_INTERNET_DISCONNECTED/i.test(
    message,
  );
}

/**
 * True when the session is expired/missing (UNAUTHENTICATED or HTTP 401).
 * Narrower than `isAuthError` — excludes FORBIDDEN and network errors, which
 * a token refresh would not fix.
 */
export function isUnauthenticated(error: unknown): boolean {
  return (
    hasGraphQLErrorCode(error, ['UNAUTHENTICATED']) ||
    hasHttpStatus(error, [401])
  );
}

/** True when the server rejected the session (expired / missing cookie). */
export function isAuthError(error: unknown): boolean {
  return (
    hasGraphQLErrorCode(error, ['UNAUTHENTICATED', 'FORBIDDEN']) ||
    hasHttpStatus(error, [401, 403])
  );
}
