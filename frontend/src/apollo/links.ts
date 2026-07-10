import { getGraphQlUrl } from '@/constants/api';
import { HttpLink } from '@apollo/client';

export const httpLink = new HttpLink({
  uri: getGraphQlUrl,
  credentials: 'include',
});
