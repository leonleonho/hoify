import {
  typeDefs as usersTypeDefs,
  resolvers as usersResolvers,
} from "./users/index.js";
import {
  typeDefs as authTypeDefs,
  resolvers as authResolvers,
} from "./auth/index.js";
import {
  typeDefs as musicTypeDefs,
  resolvers as musicResolvers,
} from "./music/index.js";
import {
  typeDefs as playlistTypeDefs,
  resolvers as playlistResolvers,
} from "./playlist/index.js";
import {
  typeDefs as requestsTypeDefs,
  resolvers as requestsResolvers,
} from "./requests/index.js";

// ── Combine all module typeDefs ──────────────────────────────────────────────
// As more resolver modules are added, import them above and include them here.
export const typeDefs = [usersTypeDefs, authTypeDefs, musicTypeDefs, playlistTypeDefs, requestsTypeDefs];

// ── Combine all module resolvers ─────────────────────────────────────────────
// Each module exports its own resolver map; they are merged together here.
// Note: top-level Spread only covers non-Query/Mutation type resolvers (e.g.
// User, AuthPayload). Query and Mutation are merged explicitly so that
// modules adding fields to them don't overwrite each other.
export const resolvers = {
  ...usersResolvers,
  ...authResolvers,
  ...musicResolvers,
  ...playlistResolvers,
  ...requestsResolvers,
  Query: {
    ...(usersResolvers.Query ?? {}),
    ...(authResolvers.Query ?? {}),
    ...(musicResolvers.Query ?? {}),
    ...(playlistResolvers.Query ?? {}),
    ...(requestsResolvers.Query ?? {}),
  },
  Mutation: {
    ...(usersResolvers.Mutation ?? {}),
    ...(authResolvers.Mutation ?? {}),
    ...(musicResolvers.Mutation ?? {}),
    ...(playlistResolvers.Mutation ?? {}),
    ...(requestsResolvers.Mutation ?? {}),
  },
};