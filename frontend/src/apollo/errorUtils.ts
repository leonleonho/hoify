type GraphQLErrorLike = {
  message?: string;
  extensions?: { code?: string };
};

type ApolloErrorLike = {
  message?: string;
  networkError?: unknown;
  graphQLErrors?: GraphQLErrorLike[];
};

function asApolloError(error: unknown): ApolloErrorLike | null {
  if (!error || typeof error !== 'object') return null;
  return error as ApolloErrorLike;
}

/** True when the request never reached the server (offline, timeout, DNS, etc.). */
export function isNetworkError(error: unknown): boolean {
  const apollo = asApolloError(error);
  if (!apollo) return false;

  if (apollo.networkError) return true;

  const message = apollo.message ?? (error instanceof Error ? error.message : String(error));

  return /network request failed|failed to fetch|network error|load failed|timeout|ENOTFOUND|ECONNREFUSED|ERR_INTERNET_DISCONNECTED/i.test(
    message,
  );
}

/** True when the server rejected the session (expired / missing cookie). */
export function isAuthError(error: unknown): boolean {
  const apollo = asApolloError(error);
  if (!apollo) return false;

  const graphQLErrors = apollo.graphQLErrors ?? [];

  if (
    graphQLErrors.some(
      (e: GraphQLErrorLike) =>
        e.extensions?.code === 'UNAUTHENTICATED' ||
        e.extensions?.code === 'FORBIDDEN',
    )
  ) {
    return true;
  }

  const status = (apollo.networkError as { statusCode?: number } | undefined)
    ?.statusCode;
  if (status === 401 || status === 403) return true;

  return false;
}
