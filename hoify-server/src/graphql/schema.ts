import {
  typeDefs as usersTypeDefs,
  resolvers as usersResolvers,
} from "./users/index.js";
import {
  typeDefs as authTypeDefs,
  resolvers as authResolvers,
} from "./auth/index.js";

// ── Combine all module typeDefs ──────────────────────────────────────────────
// As more resolver modules are added, import them above and include them here.
export const typeDefs = [usersTypeDefs, authTypeDefs];

// ── Combine all module resolvers ─────────────────────────────────────────────
// Each module exports its own resolver map; they are merged together here.
// Note: top-level Spread only covers non-Query/Mutation type resolvers (e.g.
// User, AuthPayload). Query and Mutation are merged explicitly so that
// modules adding fields to them don't overwrite each other.
export const resolvers = {
  ...usersResolvers,
  ...authResolvers,
  Query: {
    ...(usersResolvers.Query ?? {}),
    ...(authResolvers.Query ?? {}),
  },
  Mutation: {
    ...(usersResolvers.Mutation ?? {}),
    ...(authResolvers.Mutation ?? {}),
  },
};