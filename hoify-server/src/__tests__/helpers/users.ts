import { createUser } from "../../graphql/users/services.js";
import {
  executeGraphQL,
  CREATE_USER_MUTATION,
  LOGIN_MUTATION,
  type GraphQLResponse,
} from "./graphql.js";
import type request from "supertest";

type SuperTestAgent = ReturnType<typeof request>;

export const DEFAULT_ADMIN = {
  email: "admin@test.com",
  password: "admin-secret",
  firstName: "Admin",
  lastName: "Test",
};

/**
 * Insert an admin directly (bypasses GraphQL) and return a login token.
 */
export async function seedAdminAndLogin(
  agent: SuperTestAgent,
  input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  } = DEFAULT_ADMIN,
): Promise<{ token: string; userId: string }> {
  const user = await createUser(input, "admin");

  const loginRes = await executeGraphQL<{
    login: { token: string; user: { id: string } };
  }>(agent, {
    query: LOGIN_MUTATION,
    variables: { email: input.email, password: input.password },
  });

  if (!loginRes.data?.login.token) {
    throw new Error(
      `Failed to login seeded admin: ${JSON.stringify(loginRes.errors)}`,
    );
  }

  return { token: loginRes.data.login.token, userId: user.id };
}

/**
 * Create a regular user via GraphQL (requires admin token).
 */
export async function createUserAsAdmin(
  agent: SuperTestAgent,
  adminToken: string,
  input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  },
): Promise<GraphQLResponse<{ createUser: { id: string; role: string } }>> {
  return executeGraphQL(agent, {
    query: CREATE_USER_MUTATION,
    variables: { input },
    token: adminToken,
  });
}
