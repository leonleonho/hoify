import { from, HttpLink } from '@apollo/client';
import { getGraphQlUrl } from '@/constants/api';
import { authRefreshLink } from './refreshTokenLink';

export const httpLink = new HttpLink({
  uri: getGraphQlUrl,
  credentials: 'include',
});

// Auth-refresh link must precede httpLink so retries re-run the HTTP request.
export const link = from([authRefreshLink, httpLink]);
