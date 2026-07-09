/**
 * Library Scanner — standalone entry point.
 *
 * Usage:
 *   MUSIC_LIBRARY_PATH=/path/to/music npx tsx src/jobs/library-scanner/run.ts
 *   npm run scan:library
 */

import "dotenv/config";
import { client } from "../../db/index.js";
import { logger } from "../../util/logger.js";
import { scanLibrary } from "./scanner.js";
import { connection } from "../../db/redis.js";
import { musicLibraryPath } from "../../paths.js";

async function main() {
  logger.info("=== Hoify Library Scanner ===\n");
  logger.info(
    { path: musicLibraryPath },
    `Music library path: ${musicLibraryPath}`,
  );

  const summary = await scanLibrary(musicLibraryPath);

  logger.info(
    {
      filesFound: summary.filesFound,
      enqueued: summary.filesFound - summary.skipped,
      skipped: summary.skipped,
    },
    "=== Summary ===",
  );
}

main()
  .catch((err) => {
    logger.error(err, "Fatal error");
    process.exit(1);
  })
  .finally(async () => {
    await connection.quit();
    await client.end();
    logger.info("Connections closed. Goodbye!");
  });
