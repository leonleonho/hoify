import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

import {
  executeGraphQL,
  CREATE_USER_MUTATION,
  LOGIN_MUTATION,
  ME_QUERY,
} from "../helpers/graphql.js";
import { seedAdminAndLogin } from "../helpers/users.js";

const UPDATE_USER_MUTATION = `
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      firstName
      lastName
    }
  }
`;

const DELETE_USER_MUTATION = `
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;
import { setupE2e, type E2eFixture } from "../helpers/setup-e2e.js";

// ── Shared state (populated in beforeAll) ─────────────────────────────────
let fixture: E2eFixture;
let agent: ReturnType<typeof request>;

let adminToken: string;
let authToken: string;
let userId: string;

const TEST_USER = {
  email: "bob@test.com",
  password: "secret123",
  firstName: "Bob",
  lastName: "Test",
};

beforeAll(async () => {
  fixture = await setupE2e();
  agent = fixture.agent;

  const admin = await seedAdminAndLogin(agent);
  adminToken = admin.token;

  // Create a regular user + login once for all tests in this file
  const createRes = await executeGraphQL<{
    createUser: { id: string };
  }>(agent, {
    query: CREATE_USER_MUTATION,
    variables: { input: TEST_USER },
    token: adminToken,
  });
  userId = createRes.data!.createUser.id;

  const loginRes = await executeGraphQL<{
    login: { token: string };
  }>(agent, {
    query: LOGIN_MUTATION,
    variables: {
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
  });
  authToken = loginRes.data!.login.token;
});

afterAll(async () => {
  await fixture?.cleanup();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Users e2e", () => {
  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------

  it("creates a user with default role and isActive", async () => {
    const res = await executeGraphQL<{
      createUser: {
        id: string;
        role: string;
        isActive: boolean;
        verifiedAt: string | null;
      };
    }>(agent, {
      query: CREATE_USER_MUTATION,
      variables: {
        input: {
          email: "defaults@test.com",
          password: "secret123",
          firstName: "Default",
          lastName: "Check",
        },
      },
      token: adminToken,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.createUser.role).toBe("user");
    expect(res.data!.createUser.isActive).toBe(true);
    expect(res.data!.createUser.verifiedAt).toBeNull();
  });

  it("sets createdAt and updatedAt timestamps on creation", async () => {
    const res = await executeGraphQL<{
      createUser: {
        createdAt: string;
        updatedAt: string;
        verifiedAt: string | null;
      };
    }>(agent, {
      query: CREATE_USER_MUTATION,
      variables: {
        input: {
          email: "timestamps@test.com",
          password: "secret123",
          firstName: "Time",
          lastName: "Stamp",
        },
      },
      token: adminToken,
    });

    expect(res.errors).toBeUndefined();
    const createdAt = new Date(res.data!.createUser.createdAt);
    const updatedAt = new Date(res.data!.createUser.updatedAt);
    expect(createdAt.getTime()).toBeGreaterThan(0);
    expect(updatedAt.getTime()).toBeGreaterThan(0);
    expect(res.data!.createUser.verifiedAt).toBeNull();
  });

  it("rejects createUser without auth", async () => {
    const res = await executeGraphQL(agent, {
      query: CREATE_USER_MUTATION,
      variables: {
        input: {
          email: "noauth-user@test.com",
          password: "secret123",
          firstName: "No",
          lastName: "Auth",
        },
      },
    });

    expect(res.data).toBeFalsy();
    expect(res.errors![0]?.extensions?.code).toBe("UNAUTHENTICATED");
  });

  it("rejects createUser for non-admin users", async () => {
    const res = await executeGraphQL(agent, {
      query: CREATE_USER_MUTATION,
      variables: {
        input: {
          email: "forbidden-user@test.com",
          password: "secret123",
          firstName: "For",
          lastName: "Bidden",
        },
      },
      token: authToken,
    });

    expect(res.data).toBeFalsy();
    expect(res.errors![0]?.extensions?.code).toBe("FORBIDDEN");
  });

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  it("updates user email", async () => {
    const res = await executeGraphQL<{
      updateUser: { id: string; email: string; firstName: string; lastName: string };
    }>(agent, {
      query: UPDATE_USER_MUTATION,
      variables: {
        id: userId,
        input: { email: "bob-updated@test.com" },
      },
      token: authToken,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.updateUser.email).toBe("bob-updated@test.com");
    expect(res.data!.updateUser.firstName).toBe(TEST_USER.firstName);
    expect(res.data!.updateUser.lastName).toBe(TEST_USER.lastName);
  });

  it("updates user firstName and lastName simultaneously", async () => {
    const res = await executeGraphQL<{
      updateUser: { firstName: string; lastName: string };
    }>(agent, {
      query: UPDATE_USER_MUTATION,
      variables: {
        id: userId,
        input: { firstName: "Bobby", lastName: "McTest" },
      },
      token: authToken,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.updateUser.firstName).toBe("Bobby");
    expect(res.data!.updateUser.lastName).toBe("McTest");
  });

  it("returns null when updating a non-existent user", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await executeGraphQL<{
      updateUser: Record<string, unknown> | null;
    }>(agent, {
      query: UPDATE_USER_MUTATION,
      variables: {
        id: fakeId,
        input: { firstName: "Ghost" },
      },
      token: authToken,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.updateUser).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  it("deletes an existing user and returns true", async () => {
    const createRes = await executeGraphQL<{
      createUser: { id: string };
    }>(agent, {
      query: CREATE_USER_MUTATION,
      variables: {
        input: {
          email: "delete-me@test.com",
          password: "secret123",
          firstName: "Delete",
          lastName: "Me",
        },
      },
      token: adminToken,
    });
    const disposableId = createRes.data!.createUser.id;

    const deleteRes = await executeGraphQL<{
      deleteUser: boolean;
    }>(agent, {
      query: DELETE_USER_MUTATION,
      variables: { id: disposableId },
      token: authToken,
    });

    expect(deleteRes.errors).toBeUndefined();
    expect(deleteRes.data!.deleteUser).toBe(true);
  });

  it("returns false when deleting a non-existent user", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await executeGraphQL<{
      deleteUser: boolean;
    }>(agent, {
      query: DELETE_USER_MUTATION,
      variables: { id: fakeId },
      token: authToken,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.deleteUser).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Full lifecycle
  // -----------------------------------------------------------------------

  it("completes full lifecycle: create → update → me → delete → me fails", async () => {
    const createRes = await executeGraphQL<{
      createUser: { id: string };
    }>(agent, {
      query: CREATE_USER_MUTATION,
      variables: {
        input: {
          email: "lifecycle@test.com",
          password: "secret123",
          firstName: "Life",
          lastName: "Cycle",
        },
      },
      token: adminToken,
    });
    const lifecycleId = createRes.data!.createUser.id;

    const loginRes = await executeGraphQL<{
      login: { token: string; user: { id: string } };
    }>(agent, {
      query: LOGIN_MUTATION,
      variables: { email: "lifecycle@test.com", password: "secret123" },
    });
    const lifecycleToken = loginRes.data!.login.token;

    const updateRes = await executeGraphQL<{
      updateUser: { firstName: string; lastName: string };
    }>(agent, {
      query: UPDATE_USER_MUTATION,
      variables: {
        id: lifecycleId,
        input: { firstName: "Full", lastName: "Cycle" },
      },
      token: lifecycleToken,
    });
    expect(updateRes.data!.updateUser.firstName).toBe("Full");

    const meRes = await executeGraphQL<{
      me: { id: string; firstName: string };
    }>(agent, {
      query: ME_QUERY,
      token: lifecycleToken,
    });
    expect(meRes.data!.me.id).toBe(lifecycleId);
    expect(meRes.data!.me.firstName).toBe("Full");

    const deleteRes = await executeGraphQL<{
      deleteUser: boolean;
    }>(agent, {
      query: DELETE_USER_MUTATION,
      variables: { id: lifecycleId },
      token: lifecycleToken,
    });
    expect(deleteRes.data!.deleteUser).toBe(true);

    const meAfterDelete = await executeGraphQL(agent, {
      query: ME_QUERY,
      token: lifecycleToken,
    });
    expect(meAfterDelete.data).toBeFalsy();
    expect(meAfterDelete.errors).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // Auth guards
  // -----------------------------------------------------------------------

  it("rejects updateUser without auth token", async () => {
    const res = await executeGraphQL(agent, {
      query: UPDATE_USER_MUTATION,
      variables: {
        id: userId,
        input: { lastName: "ShouldNotWork" },
      },
    });

    expect(res.data?.updateUser).toBeNull();
    expect(res.errors).toBeDefined();
  });

  it("rejects deleteUser without auth token", async () => {
    const res = await executeGraphQL(agent, {
      query: DELETE_USER_MUTATION,
      variables: { id: userId },
    });

    expect(res.data).toBeFalsy();
    expect(res.errors).toBeDefined();
    expect(res.errors![0]?.extensions?.code).toBe("UNAUTHENTICATED");
  });
});
