import type {
  ApolloServerPlugin,
  GraphQLFieldResolverParams,
} from "@apollo/server";
import type { Context } from "./resolvers.js";
import { GraphQLError } from "graphql";
import type { User } from "../../db/schema.js";

/**
 * Operations that can be called without authentication.
 * Everything else on Query and Mutation requires a valid token.
 */
const PUBLIC_OPERATIONS: Record<string, string[]> = {
  Query: [
    "searchMusic",
    "artists",
    "artist",
    "albums",
    "album",
    "tracks",
    "track",
    "genres",
    "genre",
  ],
  Mutation: ["createUser", "login"],
};

export const authPlugin: ApolloServerPlugin<Context> = {
  requestDidStart: async () => ({
    executionDidStart: async () => ({
      willResolveField: ({
        contextValue,
        info,
      }: GraphQLFieldResolverParams<unknown, Context>) => {
        const { parentType, fieldName } = info;

        // Only guard top-level Query/Mutation fields
        if (parentType.name !== "Query" && parentType.name !== "Mutation") {
          return;
        }

        // Allow public operations
        const publicFields = PUBLIC_OPERATIONS[parentType.name];
        if (publicFields?.includes(fieldName)) {
          return;
        }

        // Everything else requires authentication
        requireAuth(contextValue.currentUser);
      },
    }),
  }),
};

export function requireAuth(
  currentUser: User | null,
): asserts currentUser is User {
  if (!currentUser) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
}