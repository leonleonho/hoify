/**
 * Standalone enrichment worker process.
 *
 * Usage:
 *   npm run enrichment:worker
 */

import "dotenv/config";
import { logger } from "../util/logger.js";
import { enrichmentWorker } from "./worker.js";

logger.info("Enrichment worker started, waiting for jobs...");

process.on("SIGINT", async () => {
  logger.info("Shutting down enrichment worker...");
  await enrichmentWorker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down enrichment worker...");
  await enrichmentWorker.close();
  process.exit(0);
});
