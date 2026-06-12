import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

import { setupE2e } from "../helpers/setup-e2e.js";
import { executeGraphQL } from "../helpers/graphql.js";
import {
  CREATE_USER_MUTATION,
  LOGIN_MUTATION,
  ME_QUERY,
} from "../helpers/graphql.js";

import type { E2eFixture } from "../helpers/setup-e2e.js";

// ── Shared state (populated in beforeAll) ─────────────────────────────────
let fixture: E2eFixture;
let agent: ReturnType<typeof request>;

const TEST_USER = {
  email: "alice@test.com",
  password: "secret123",
  firstName: "Alice",
  lastName: "Test",
};

let authToken: string;

beforeAll(async () => {
  fixture = await setupE2e();
  agent = fixture.agent;
});

afterAll(async () => {
  await fixture?.cleanup();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Auth e2e", () => {
  it("creates a user with all input fields", async () => {
    const res = await executeGraphQL<{
      createUser: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        isActive: boolean;
        verifiedAt: string | null;
        createdAt: string;
        updatedAt: string;
      };
    }>(agent, {
      query: CREATE_USER_MUTATION,
      variables: { input: TEST_USER },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data).toBeDefined();
    const user = res.data!.createUser;
    expect(user.email).toBe(TEST_USER.email);
    expect(user.firstName).toBe(TEST_USER.firstName);
    expect(user.lastName).toBe(TEST_USER.lastName);
    expect(user.role).toBe("user");
    expect(user.isActive).toBe(true);
    expect(user.verifiedAt).toBeNull();
    expect(user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(user.createdAt).toBeTruthy();
    expect(user.updatedAt).toBeTruthy();
  });

  it("rejects duplicate email on createUser", async () => {
    const res = await executeGraphQL(agent, {
      query: CREATE_USER_MUTATION,
      variables: { input: TEST_USER },
    });

    // `createUser: User!` non-null → entire data is null on error
    expect(res.data).toBeFalsy();
    expect(res.errors).toBeDefined();
    expect(res.errors!.length).toBeGreaterThan(0);
  });

  it("logs in with valid credentials", async () => {
    const res = await executeGraphQL<{
      login: { token: string; user: { id: string; email: string } };
    }>(agent, {
      query: LOGIN_MUTATION,
      variables: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data).toBeDefined();
    expect(res.data!.login.token).toBeTruthy();
    expect(res.data!.login.user.email).toBe(TEST_USER.email);
    authToken = res.data!.login.token;
  });

  it("rejects login with wrong password", async () => {
    const res = await executeGraphQL(agent, {
      query: LOGIN_MUTATION,
      variables: {
        email: TEST_USER.email,
        password: "wrong-password",
      },
    });

    expect(res.data).toBeFalsy();
    expect(res.errors).toBeDefined();
    expect(res.errors![0]?.extensions?.code).toBe("UNAUTHENTICATED");
  });

  it("rejects login for non-existent email", async () => {
    const res = await executeGraphQL(agent, {
      query: LOGIN_MUTATION,
      variables: {
        email: "nobody@test.com",
        password: "irrelevant",
      },
    });

    expect(res.data).toBeFalsy();
    expect(res.errors).toBeDefined();
    expect(res.errors![0]?.extensions?.code).toBe("UNAUTHENTICATED");
  });

  it("returns authenticated user via me with Bearer token", async () => {
    const res = await executeGraphQL<{
      me: { id: string; email: string; firstName: string; lastName: string };
    }>(agent, {
      query: ME_QUERY,
      token: authToken,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data).toBeDefined();
    expect(res.data!.me.email).toBe(TEST_USER.email);
    expect(res.data!.me.firstName).toBe(TEST_USER.firstName);
  });

  it("rejects me query without any auth", async () => {
    const res = await executeGraphQL(agent, {
      query: ME_QUERY,
    });

    // `me: User!` is non-null → auth failure nullifies entire data
    expect(res.data).toBeFalsy();
    expect(res.errors).toBeDefined();
    expect(res.errors![0]?.message).toMatch(/authentication required/i);
  });

  it("rejects me query with an invalid token", async () => {
    const res = await executeGraphQL(agent, {
      query: ME_QUERY,
      token: "garbage-invalid-token",
    });

    // Invalid token = no currentUser = auth error = data is null
    expect(res.data).toBeFalsy();
    expect(res.errors).toBeDefined();
  });

  it("sets httpOnly cookie on login response", async () => {
    // Create a fresh user to get a clean login response
    const freshUser = {
      email: "cookie-test@test.com",
      password: "secret123",
      firstName: "Cookie",
      lastName: "Test",
    };

    await executeGraphQL(agent, {
      query: CREATE_USER_MUTATION,
      variables: { input: freshUser },
    });

    const loginRes = await agent
      .post("/graphql")
      .send({
        query: LOGIN_MUTATION,
        variables: {
          email: freshUser.email,
          password: freshUser.password,
        },
      })
      .set("Content-Type", "application/json");

    const setCookie = loginRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toContain("token=");
    expect(cookieStr).toMatch(/httponly/i);
    expect(cookieStr).toMatch(/samesite=lax/i);
  });
});