import { InMemoryCache } from '@apollo/client';

type PageLike = {
  items?: ReadonlyArray<unknown>;
  totalCount?: number;
};

function mergeOffsetPage(
  existing: PageLike | undefined,
  incoming: PageLike,
  offset: number,
): PageLike {
  const existingItems = existing?.items ? existing.items.slice(0) : [];
  const incomingItems = incoming.items ?? [];
  const mergedItems = existingItems.slice(0);

  for (let i = 0; i < incomingItems.length; i++) {
    mergedItems[offset + i] = incomingItems[i];
  }

  return {
    ...incoming,
    items: mergedItems,
    totalCount: incoming.totalCount ?? existing?.totalCount ?? 0,
  };
}

export const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        artists: {
          keyArgs: false,
          merge(existing: PageLike | undefined, incoming: PageLike, { args }) {
            return mergeOffsetPage(existing, incoming, args?.offset ?? 0);
          },
        },
        albums: {
          keyArgs: ['artistId'],
          merge(existing: PageLike | undefined, incoming: PageLike, { args }) {
            return mergeOffsetPage(existing, incoming, args?.offset ?? 0);
          },
        },
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
