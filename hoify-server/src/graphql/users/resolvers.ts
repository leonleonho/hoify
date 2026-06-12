import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

const SALT_ROUNDS = 12;

/** Format a Date value as an ISO string for GraphQL's String type. */
function fmt(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export const resolvers = {
  User: {
    verifiedAt: (parent: { verifiedAt: Date | string | null }) =>
      fmt(parent.verifiedAt),
    createdAt: (parent: { createdAt: Date | string }) => fmt(parent.createdAt),
    updatedAt: (parent: { updatedAt: Date | string }) => fmt(parent.updatedAt),
  },

  Query: {
    users: async () => {
      return db.select().from(users);
    },

    user: async (_: unknown, args: { id: string }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, args.id));
      return user ?? null;
    },
  },

  Mutation: {
    createUser: async (
      _: unknown,
      args: {
        input: {
          email: string;
          password: string;
          firstName: string;
          lastName: string;
        };
      },
    ) => {
      const passwordHash = await bcrypt.hash(args.input.password, SALT_ROUNDS);

      const [user] = await db
        .insert(users)
        .values({
          email: args.input.email,
          passwordHash,
          firstName: args.input.firstName,
          lastName: args.input.lastName,
        })
        .returning();

      return user;
    },

    updateUser: async (
      _: unknown,
      args: {
        id: string;
        input: {
          email?: string;
          firstName?: string;
          lastName?: string;
        };
      },
    ) => {
      const [user] = await db
        .update(users)
        .set(args.input)
        .where(eq(users.id, args.id))
        .returning();

      return user ?? null;
    },

    deleteUser: async (_: unknown, args: { id: string }) => {
      const [deleted] = await db
        .delete(users)
        .where(eq(users.id, args.id))
        .returning({ id: users.id });

      return !!deleted;
    },
  },
};