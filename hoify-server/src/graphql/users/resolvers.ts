import { fmtDate, createUser, updateUser, deleteUser } from "./services.js";

export const resolvers = {
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
    ) => createUser(args.input),

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