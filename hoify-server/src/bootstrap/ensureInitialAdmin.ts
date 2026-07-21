import { count, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { createUser } from "../graphql/users/services.js";
import { logger } from "../util/logger.js";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "23505"
  );
}

async function adminCount(): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, "admin"));
  return value;
}

/**
 * Ensure at least one admin exists.
 * On first startup (or after all admins were removed), create/promote from INIT_ADMIN_*.
 * Concurrent startups are safe: unique-email conflicts are treated as another winner.
 */
export async function ensureInitialAdmin(): Promise<void> {
  if ((await adminCount()) > 0) {
    logger.debug("Admin user(s) already exist; skipping initial admin bootstrap");
    return;
  }

  const email = process.env.INIT_ADMIN_EMAIL;
  const password = process.env.INIT_ADMIN_PASSWORD;
  const firstName = process.env.INIT_ADMIN_FIRST_NAME;
  const lastName = process.env.INIT_ADMIN_LAST_NAME;

  const missing = (
    [
      ["INIT_ADMIN_EMAIL", email],
      ["INIT_ADMIN_PASSWORD", password],
      ["INIT_ADMIN_FIRST_NAME", firstName],
      ["INIT_ADMIN_LAST_NAME", lastName],
    ] as const
  )
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(
      `No admin users exist and initial admin env vars are missing: ${missing.join(", ")}. ` +
        "Set these to bootstrap an admin account.",
    );
  }

  try {
    await createUser(
      {
        email: email!,
        password: password!,
        firstName: firstName!,
        lastName: lastName!,
      },
      "admin",
    );
    logger.info(
      { email },
      "Initial admin user created from environment variables",
    );
    return;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }

  // Another instance won the race, or INIT_ADMIN_EMAIL already belongs to a user.
  if ((await adminCount()) > 0) {
    logger.debug(
      "Admin already present after create conflict; continuing startup",
    );
    return;
  }

  const [promoted] = await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, email!))
    .returning({ id: users.id, email: users.email });

  if (!promoted) {
    throw new Error(
      `Failed to bootstrap admin: email ${email} conflicted but no matching user was found.`,
    );
  }

  logger.info(
    { email: promoted.email },
    "Promoted existing user to admin (no admins remained)",
  );
}
