import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { GraphQLError } from "graphql";
import jwt from "jsonwebtoken";
import type { Response } from "express";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JwtPayload {
  userId: string;
  role: "admin" | "moderator" | "user";
}

export interface Context {
  currentUser: typeof users.$inferSelect | null;
  res: Response;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signToken(user: typeof users.$inferSelect): string {
  return jwt.sign(
    { userId: user.id, role: user.role } satisfies JwtPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
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

  const token = signToken(user);
  setAuthCookie(res, token);

  return { token, user };
}