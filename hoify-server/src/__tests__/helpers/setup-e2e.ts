import request from "supertest";
import { startContainer, startRedisContainer } from "./docker.js";
import { reconnect as reconnectDb } from "../../db/index.js";
import { reconnect as reconnectRedis } from "../../db/redis.js";
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
 * Reset cached BullMQ queues so next access creates fresh Queue with new redis connection.
 */
async function resetQueues(): Promise<void> {
  try {
    const { replaceRedisClient } = await import("../../jobs/enrichment/queue.js");
    await replaceRedisClient();
  } catch { /* not cached */ }
}

/**
 * One-shot e2e test setup:
 *  1. Spin up Docker Postgres + Redis containers (random ports)
 *  2. Point db + redis singletons at test containers
 *  3. Run all Drizzle migrations
 *  4. Create the Express + Apollo app
 *  5. Return supertest agent + cleanup function
 *
 * Call once per test file in `beforeAll`, tear down in `afterAll`.
 * Each file gets its own isolated containers.
 */
export async function setupE2e(): Promise<E2eFixture> {
  const [pg, redisCt] = await Promise.all([
    startContainer(),
    startRedisContainer(),
  ]);

  const dbUrl = `postgresql://hoify:hoify_dev@localhost:${pg.port}/hoify`;
  await reconnectDb(dbUrl);

  const redisUrl = `redis://localhost:${redisCt.port}/0`;
  reconnectRedis(redisUrl);
  await resetQueues();

  // Re-import after reconnect so the migrated db is the connected one
  const { db } = await import("../../db/index.js");
  await migrate(db, { migrationsFolder });

  const { createApp } = await import("../../app.js");
  const { app, server } = await createApp();

  const agent = request(app);

  const cleanup = async () => {
    await server?.stop();
    await pg.cleanup();
    await redisCt.cleanup();
  };

  return { app, agent, cleanup };
}