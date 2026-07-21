import { count } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { createUser } from "../graphql/users/services.js";
import { logger } from "../util/logger.js";

/**
 * On first startup (empty users table), create the initial admin from env vars.
 * Once any user exists, this is a no-op — INIT_ADMIN_* is never used again.
 */
export async function ensureInitialAdmin(): Promise<void> {
  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(users);

  if (userCount > 0) {
    logger.debug("Users already exist; skipping initial admin bootstrap");
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
      `No users exist and initial admin env vars are missing: ${missing.join(", ")}. ` +
        "Set these to bootstrap the first admin account.",
    );
  }

  await createUser(
    {
      email: email!,
      password: password!,
      firstName: firstName!,
      lastName: lastName!,
    },
    "admin",
  );

  logger.info({ email }, "Initial admin user created from environment variables");
}
