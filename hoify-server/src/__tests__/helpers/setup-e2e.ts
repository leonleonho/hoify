import request from "supertest";
import { startContainer } from "./docker.js";
import { reconnect } from "../../db/index.js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, "../../db/migrations");

export interface E2eFixture {
  app: import("express").Express;
  agent: ReturnType<typeof request>;
  cleanup: () => Promise<void>;
}

/**
 * One-shot e2e test setup:
 *  1. Spin up a Docker Postgres container (random port)
 *  2. Point the db singleton at it
 *  3. Run all Drizzle migrations
 *  4. Create the Express + Apollo app
 *  5. Return supertest agent + cleanup function
 *
 * Call once per test file in `beforeAll`, tear down in `afterAll`.
 * Each file gets its own isolated Postgres container.
 */
export async function setupE2e(): Promise<E2eFixture> {
  const container = await startContainer();

  const dbUrl = `postgresql://hoify:hoify_dev@localhost:${container.port}/hoify`;
  await reconnect(dbUrl);

  // Re-import after reconnect so the migrated db is the connected one
  const { db } = await import("../../db/index.js");
  await migrate(db, { migrationsFolder });

  const { createApp } = await import("../../app.js");
  const { app, server } = await createApp();

  const agent = request(app);

  const cleanup = async () => {
    await server?.stop();
    await container.cleanup();
  };

  return { app, agent, cleanup };
}