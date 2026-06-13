import { ApolloClient } from '@apollo/client';
import { cache } from './cache';
import { httpLink } from './links';

export const client = new ApolloClient({
  link: httpLink,
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
