import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { logger } from "../util/logger.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const drizzleLogger = {
  logQuery(query: string, params: unknown[]) {
    logger.trace({ query, params }, "db query");
  },
};

export let client = postgres(connectionString, { idle_timeout: 0 });
export let db = drizzle(client, { logger: drizzleLogger });

/**
 * Replace the database connection with a new one.
 * Used by e2e tests to point at a test-container Postgres instance.
 * The old client is ended gracefully before replacement.
 */
export async function reconnect(url: string): Promise<void> {
  await client.end();
  client = postgres(url);
  db = drizzle(client, { logger: drizzleLogger });
}