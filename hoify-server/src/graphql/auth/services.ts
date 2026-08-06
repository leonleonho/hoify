import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TokenType = "access" | "refresh";

export interface JwtPayload {
  userId: string;
  role: "admin" | "moderator" | "user";
  type?: TokenType;
}

export interface Context {
  currentUser: typeof users.$inferSelect | null;
  req: Request;
  res: Response;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

const ACCESS_TOKEN_EXPIRES_IN = "1h";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

const ACCESS_TOKEN_COOKIE = "token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 1000; // 1 hour in ms
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

// Only sent to the GraphQL endpoint, never /stream or /art.
const REFRESH_COOKIE_PATH = "/graphql";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signToken(
  user: typeof users.$inferSelect,
  type: TokenType = "access",
): string {
  return jwt.sign(
    { userId: user.id, role: user.role, type } satisfies JwtPayload,
    JWT_SECRET,
    {
      expiresIn:
        type === "refresh" ? REFRESH_TOKEN_EXPIRES_IN : ACCESS_TOKEN_EXPIRES_IN,
    },
  );
}

function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ACCESS_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: REFRESH_COOKIE_PATH,
    secure: process.env.NODE_ENV === "production",
  });
}

function clearAuthCookies(res: Response): void {
  // clearCookie path must match the path the cookie was set with, or clearing no-ops.
  res.clearCookie(ACCESS_TOKEN_COOKIE);
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: REFRESH_COOKIE_PATH });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function login(email: string, password: string, res: Response) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    throw new GraphQLError("Invalid email or password", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new GraphQLError("Invalid email or password", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }

  const accessToken = signToken(user, "access");
  const refreshToken = signToken(user, "refresh");
  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);

  return { token: accessToken, user };
}

export async function refreshToken(req: Request, res: Response): Promise<boolean> {
  const token = req.cookies?.[REFRESH_TOKEN_COOKIE];

  if (!token) {
    clearAuthCookies(res);
    return false;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (payload.type !== "refresh") {
      clearAuthCookies(res);
      return false;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId));

    if (!user || !user.isActive) {
      clearAuthCookies(res);
      return false;
    }

    setAccessTokenCookie(res, signToken(user, "access"));
    setRefreshTokenCookie(res, signToken(user, "refresh"));

    return true;
  } catch {
    // Expired or invalid refresh token — clear both cookies.
    clearAuthCookies(res);
    return false;
  }
}