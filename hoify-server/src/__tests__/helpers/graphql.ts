import supertest from "supertest";

type SuperTestAgent = ReturnType<typeof supertest>;

// ---------------------------------------------------------------------------
// GraphQL query / mutation constants
// ---------------------------------------------------------------------------

export const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      firstName
      lastName
      role
      isActive
      verifiedAt
      createdAt
      updatedAt
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        firstName
        lastName
        role
        isActive
      }
    }
  }
`;

export const ME_QUERY = `
  query Me {
    me {
      id
      email
      firstName
      lastName
      role
      isActive
      verifiedAt
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_USER_MUTATION = `
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      firstName
      lastName
    }
  }
`;

export const DELETE_USER_MUTATION = `
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GraphQLResponse<T = Record<string, unknown>> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: Record<string, unknown>;
  }>;
}

// ---------------------------------------------------------------------------
// Helper: execute a GraphQL operation via supertest
// ---------------------------------------------------------------------------

/**
 * Send a GraphQL operation via supertest.
 *
 * @param agent  - supertest agent wrapping the Express app
 * @param query  - the GraphQL query/mutation string
 * @param variables - optional variables object
 * @param token  - optional JWT for Authorization header
 */
export async function executeGraphQL<T = Record<string, unknown>>(
  agent: SuperTestAgent,
  {
    query,
    variables,
    token,
  }: {
    query: string;
    variables?: Record<string, unknown>;
    token?: string;
  },
): Promise<GraphQLResponse<T>> {
  const req = agent
    .post("/graphql")
    .send({ query, variables })
    .set("Content-Type", "application/json")
    .set("Accept", "application/json");

  if (token) {
    req.set("Authorization", `Bearer ${token}`);
  }

  const res = await req;
  return res.body as GraphQLResponse<T>;
}