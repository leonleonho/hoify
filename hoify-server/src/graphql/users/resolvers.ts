import { fmtDate, createUser, updateUser, deleteUser } from "./services.js";
import { requireAdmin } from "../auth/plugin.js";
import type { Context } from "../auth/resolvers.js";

export const resolvers = {
  UserRole: {
    admin: "admin",
    moderator: "moderator",
    user: "user",
  },

  User: {
    verifiedAt: (parent: { verifiedAt: Date | string | null }) =>
      fmtDate(parent.verifiedAt),
    createdAt: (parent: { createdAt: Date | string }) =>
      fmtDate(parent.createdAt),
    updatedAt: (parent: { updatedAt: Date | string }) =>
      fmtDate(parent.updatedAt),
  },

  Query: {},

  Mutation: {
    createUser: (
      _: unknown,
      args: {
        input: {
          email: string;
          password: string;
          firstName: string;
          lastName: string;
        };
      },
      context: Context,
    ) => {
      requireAdmin(context.currentUser);
      return createUser(args.input);
    },

    updateUser: (
      _: unknown,
      args: {
        id: string;
        input: {
          email?: string;
          firstName?: string;
          lastName?: string;
        };
      },
    ) => updateUser(args.id, args.input),

    deleteUser: (_: unknown, args: { id: string }) => deleteUser(args.id),
  },
};
