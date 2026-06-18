import "dotenv/config";
import { client } from "./db/index.js";
import { createApp } from "./app.js";
import { closeWorker } from "./enrichment/worker.js";
import { connection } from "./enrichment/queue.js";
import { logger } from "./util/logger.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function start() {
  const { app } = await createApp();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, `🚀 hoify-server ready at http://localhost:${PORT}`);
    logger.info(`📡 GraphQL at http://localhost:${PORT}/graphql`);
    logger.info(`🎵 Streaming at http://localhost:${PORT}/stream/:trackId`);
    logger.info("📦 Database connected");
    logger.info("⚙️  Enrichment worker started");
  });
}

// ── Graceful shutdown ──────────────────────────────────────────────────────
process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  await closeWorker();
  await connection.quit();
  await client.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down...");
  await closeWorker();
  await connection.quit();
  await client.end();
  process.exit(0);
});

start().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});