import "dotenv/config";
import { client } from "./db/index.js";
import { createApp } from "./app.js";
import { closeWorker } from "./jobs/enrichment/worker.js";
import { closeWorker as closeMusicRequestWorker } from "./jobs/music-request/worker.js";
import { connection } from "./db/redis.js";
import { logger } from "./util/logger.js";
import { ingestAndScan } from "./jobs/beets-ingest/run.js";
import { startWatchIngest } from "./jobs/beets-ingest/watcher.js";
import { ingestPath } from "./paths.js";

const PORT = parseInt(process.env.PORT ?? "4000", 10);

async function start() {
  const { app } = await createApp();

  app.listen(PORT, () => {
    logger.info({ port: PORT }, `🚀 hoify-server ready at http://localhost:${PORT}`);
    logger.info(`📡 GraphQL at http://localhost:${PORT}/graphql`);
    logger.info(`🎵 Streaming at http://localhost:${PORT}/stream/:trackId`);
    logger.info(`🖼️  Album art at http://localhost:${PORT}/art/:filename`);
    logger.info("📦 Database connected");
    logger.info("⚙️  Enrichment worker started");

    // non-blocking: run beets import + library scan at boot
    ingestAndScan(ingestPath)
      .then(() => {
        logger.info("Startup ingest complete. Starting file watcher...");
        startWatchIngest(ingestPath);
      })
      .catch((err) => {
        logger.error(err, "Beets ingest failed at startup");
        logger.info("Starting file watcher anyway...");
        startWatchIngest(ingestPath);
      });
  });
}

// ── Graceful shutdown ──────────────────────────────────────────────────────
process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  await closeWorker();
  await closeMusicRequestWorker();
  await connection.quit();
  await client.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down...");
  await closeWorker();
  await closeMusicRequestWorker();
  await connection.quit();
  await client.end();
  process.exit(0);
});

start().catch((err) => {
  logger.error(err, "Failed to start server");
  process.exit(1);
});