import { login, type Context } from "./services.js";

// Re-export for use by the plugin, util, and other modules
export type { Context, JwtPayload } from "./services.js";

export const resolvers = {
  Mutation: {
    login: (
      _: unknown,
      args: { email: string; password: string },
      context: Context,
    ) => login(args.email, args.password, context.res),
  },

  Query: {
    me: (_: unknown, __: unknown, context: Context) => context.currentUser,
  },
};