import { HttpLink } from '@apollo/client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

export const httpLink = new HttpLink({
  uri: API_URL,
  // Credentials: 'include' sends cookies (used by backend for cookie auth fallback)
  credentials: 'include',
});
