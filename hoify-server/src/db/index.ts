import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export let client = postgres(connectionString);
export let db = drizzle(client);

/**
 * Replace the database connection with a new one.
 * Used by e2e tests to point at a test-container Postgres instance.
 * The old client is ended gracefully before replacement.
 */
export async function reconnect(url: string): Promise<void> {
  await client.end();
  client = postgres(url);
  db = drizzle(client);
}