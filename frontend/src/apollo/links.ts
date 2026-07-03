import { API_URL } from '@/constants/api';
import { HttpLink } from '@apollo/client';

export const httpLink = new HttpLink({
  uri: API_URL,
  // Credentials: 'include' sends cookies (used by backend for cookie auth fallback)
  credentials: 'include',
});
