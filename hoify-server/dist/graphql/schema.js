import { typeDefs as helloTypeDefs, resolvers as helloResolvers, } from "./helloworld/index.js";
// ── Combine all module typeDefs ──────────────────────────────────────────────
// As more resolver modules are added, import them above and include them here.
export const typeDefs = [helloTypeDefs];
// ── Combine all module resolvers ─────────────────────────────────────────────
// Each module exports its own resolver map; they are merged together here.
export const resolvers = {
    ...helloResolvers,
};
//# sourceMappingURL=schema.js.map