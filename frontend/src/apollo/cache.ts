import { InMemoryCache } from '@apollo/client';

export const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Future: pagination helpers for artists/albums/tracks
      },
    },
    Artist: {
      keyFields: ['id'],
    },
    Album: {
      keyFields: ['id'],
    },
    Track: {
      keyFields: ['id'],
    },
    User: {
      keyFields: ['id'],
    },
  },
});
