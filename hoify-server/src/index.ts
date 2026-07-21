import "dotenv/config";
import { mkdirSync } from "node:fs";
import { client } from "./db/index.js";
import { createApp } from "./app.js";
import { closeWorker } from "./jobs/enrichment/worker.js";
import { connection } from "./db/redis.js";
import { logger } from "./util/logger.js";
import { ingestDropZone } from "./jobs/beets-ingest/run.js";
import { startWatchIngest } from "./jobs/beets-ingest/watcher.js";
import { scanLibrary } from "./jobs/library-scanner/scanner.js";
import { startWatchLibrary } from "./jobs/library-scanner/watcher.js";
import { ingestPath, musicLibraryPath } from "./paths.js";

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

    mkdirSync(musicLibraryPath, { recursive: true });

    // Library watcher first so beets moves during boot ingest are picked up.
    startWatchLibrary(musicLibraryPath);

    // Catch-up for files already in the library (watcher uses ignoreInitial).
    scanLibrary(musicLibraryPath)
      .then((summary) => {
        logger.info(
          {
            enqueued: summary.filesFound - summary.skipped,
            skipped: summary.skipped,
          },
          "Startup library scan complete",
        );
      })
      .catch((err) => {
        logger.error(err, "Startup library scan failed");
      });

    // Beets import of drop zone; enrichment comes from the music watcher.
    ingestDropZone(ingestPath)
      .then(() => {
        logger.info("Startup ingest complete. Starting ingest watcher...");
        startWatchIngest(ingestPath);
      })
      .catch((err) => {
        logger.error(err, "Beets ingest failed at startup");
        logger.info("Starting ingest watcher anyway...");
        startWatchIngest(ingestPath);
      });
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
