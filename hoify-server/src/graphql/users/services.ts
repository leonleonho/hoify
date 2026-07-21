import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";

const SALT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function fmtDate(
  value: Date | string | null | undefined,
): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createUser(
  input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  },
  role: "admin" | "moderator" | "user" = "user",
) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role,
    })
    .returning();

  return user;
}

export async function updateUser(
  id: string,
  input: { email?: string; firstName?: string; lastName?: string },
) {
  const [user] = await db
    .update(users)
    .set(input)
    .where(eq(users.id, id))
    .returning();

  return user ?? null;
}

export async function deleteUser(id: string) {
  const [deleted] = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id });

  return !!deleted;
}