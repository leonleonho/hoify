import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

import { LOGIN_MUTATION, ME_QUERY } from "../helpers/graphql.js";
import { seedAdminAndLogin } from "../helpers/users.js";
import { setupE2e, type E2eFixture } from "../helpers/setup-e2e.js";

const REFRESH_MUTATION = `
  mutation RefreshToken {
    refreshToken
  }
`;

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

let fixture: E2eFixture;
let sharedAgent: ReturnType<typeof request>;
let admin: { token: string; userId: string };

// ── Helpers ────────────────────────────────────────────────────────────────

/** Parse `name=value` pairs out of Set-Cookie headers. */
function parseCookies(setCookie: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of setCookie ?? []) {
    const pair = c.split(";")[0];
    const idx = pair.indexOf("=");
    if (idx > 0) out[pair.slice(0, idx)] = pair.slice(idx + 1);
  }
  return out;
}

/** Log in via a cookie jar and return the agent plus the parsed cookies. */
async function loginWithCookies(
  agent: ReturnType<typeof request>,
): Promise<{ agent: ReturnType<typeof request>; cookies: Record<string, string> }> {
  const res = await agent
    .post("/graphql")
    .send({
      query: LOGIN_MUTATION,
      variables: { email: "admin@test.com", password: "admin-secret" },
    })
    .set("Content-Type", "application/json");
  return { agent, cookies: parseCookies(res.headers["set-cookie"] as string[]) };
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  fixture = await setupE2e();
  sharedAgent = fixture.agent;
  admin = await seedAdminAndLogin(sharedAgent);
});

afterAll(async () => {
  await fixture?.cleanup();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Auth refresh e2e", () => {
  it("login sets both access and refresh cookies", async () => {
    const res = await request(fixture.app)
      .post("/graphql")
      .send({
        query: LOGIN_MUTATION,
        variables: { email: "admin@test.com", password: "admin-secret" },
      })
      .set("Content-Type", "application/json");

    const setCookie = res.headers["set-cookie"] as string[] | undefined;
    expect(setCookie).toBeDefined();

    const access = setCookie!.find((c) => c.startsWith("token="));
    const refresh = setCookie!.find((c) => c.startsWith("refresh_token="));

    expect(access).toBeDefined();
    expect(access).toMatch(/httponly/i);
    expect(access).toMatch(/samesite=lax/i);

    expect(refresh).toBeDefined();
    expect(refresh).toMatch(/httponly/i);
    expect(refresh).toMatch(/samesite=lax/i);
    expect(refresh).toMatch(/path=\/graphql/i);
  });

  it("refreshToken with a valid refresh cookie issues a new access token", async () => {
    const { agent } = await loginWithCookies(request.agent(fixture.app));

    const res = await agent
      .post("/graphql")
      .send({ query: REFRESH_MUTATION })
      .set("Content-Type", "application/json");

    expect(res.body.data.refreshToken).toBe(true);
    const setCookie = res.headers["set-cookie"] as string[] | undefined;
    expect(setCookie?.some((c) => c.startsWith("token="))).toBe(true);
  });

  it("refreshToken without a refresh cookie returns false and clears cookies", async () => {
    const res = await request(fixture.app)
      .post("/graphql")
      .send({ query: REFRESH_MUTATION })
      .set("Content-Type", "application/json");

    expect(res.body.data.refreshToken).toBe(false);
    const setCookie = res.headers["set-cookie"] as string[] | undefined;
    expect(setCookie).toBeDefined();

    // Express clearCookie uses an epoch Expires (not Max-Age) — accept either.
    const clears = (prefix: string) =>
      setCookie!.some(
        (c) =>
          c.startsWith(prefix) &&
          (/max-age=0/i.test(c) || /expires=.*1970/i.test(c)),
      );
    expect(clears("token=")).toBe(true);
    expect(clears("refresh_token=")).toBe(true);
  });

  it("rejects an access token used as a refresh token", async () => {
    const { cookies } = await loginWithCookies(request.agent(fixture.app));
    const accessToken = cookies.token;

    const res = await request(fixture.app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Cookie", `refresh_token=${accessToken}`)
      .send({ query: REFRESH_MUTATION });

    expect(res.body.data.refreshToken).toBe(false);
  });

  it("refreshes a session whose access token has expired", async () => {
    const { cookies } = await loginWithCookies(request.agent(fixture.app));
    const refreshToken = cookies.refresh_token;
    expect(refreshToken).toBeTruthy();

    const expiredAccess = jwt.sign(
      { userId: admin.userId, role: "admin", type: "access" },
      JWT_SECRET,
      { expiresIn: "-1s" },
    );

    const post = (query: string) =>
      request(fixture.app)
        .post("/graphql")
        .set("Content-Type", "application/json")
        .set("Cookie", `token=${expiredAccess}; refresh_token=${refreshToken}`)
        .send({ query });

    // (a) expired access token → me rejected
    const expiredRes = await post(ME_QUERY);
    expect(expiredRes.body.data).toBeFalsy();
    expect(expiredRes.body.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");

    // (b) refreshToken with the still-valid refresh cookie → new access token
    const refreshRes = await post(REFRESH_MUTATION);
    expect(refreshRes.body.data.refreshToken).toBe(true);
    const newAccess = parseCookies(refreshRes.headers["set-cookie"] as string[])
      .token;
    expect(newAccess).toBeTruthy();
    expect(newAccess).not.toBe(expiredAccess);

    // (c) me with the new access token succeeds
    const meRes = await request(fixture.app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Cookie", `token=${newAccess}`)
      .send({ query: ME_QUERY });
    expect(meRes.body.errors).toBeUndefined();
    expect(meRes.body.data.me.email).toBe("admin@test.com");
  });

  it("does not authenticate with a refresh token presented as an access token", async () => {
    const { cookies } = await loginWithCookies(request.agent(fixture.app));
    const refreshToken = cookies.refresh_token;

    const res = await request(fixture.app)
      .post("/graphql")
      .set("Content-Type", "application/json")
      .set("Cookie", `token=${refreshToken}`)
      .send({ query: ME_QUERY });

    expect(res.body.data).toBeFalsy();
    expect(res.body.errors?.[0]?.extensions?.code).toBe("UNAUTHENTICATED");
  });
});
