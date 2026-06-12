import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import type { JwtPayload } from "../graphql/auth/resolvers.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export interface AuthContext {
  currentUser: typeof users.$inferSelect | null;
  res: Response;
}

// ---------------------------------------------------------------------------
// Resolve the authenticated user from the incoming request
// ---------------------------------------------------------------------------

/**
 * Extract a JWT from the request (Authorization header takes precedence over
 * cookie), verify it, and return the corresponding user (or null).
 */
export async function resolveAuthContext(params: {
  req: Request;
  res: Response;
}): Promise<AuthContext> {
  const { req, res } = params;

  // 1. Check Authorization header first
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  // 2. Fall back to cookie if no header token
  if (!token) {
    token = req.cookies?.token;
  }

  // 3. Verify token and fetch user
  let currentUser: typeof users.$inferSelect | null = null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId));
      currentUser = user ?? null;
    } catch {
      // Invalid token — user stays null
    }
  }

  return { currentUser, res };
}