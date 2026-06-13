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

const MUSIC_LIBRARY_PATH =
  process.env.MUSIC_LIBRARY_PATH ?? "./music";

async function main() {
  logger.info("=== Hoify Library Scanner ===\n");
  logger.info({ path: MUSIC_LIBRARY_PATH }, `Music library path: ${MUSIC_LIBRARY_PATH}`);

  const summary = await scanLibrary(MUSIC_LIBRARY_PATH);

  logger.info({
    filesFound: summary.filesFound,
    filesParsed: summary.filesParsed,
    errors: summary.errors,
    artists: summary.counts.artists,
    albums: summary.counts.albums,
    tracks: summary.counts.tracks,
    genres: summary.counts.genres,
  }, "=== Summary ===");
}

main()
  .catch((err) => {
    logger.error(err, "Fatal error");
    process.exit(1);
  })
  .finally(async () => {
    logger.flush();
    await client.end();
    logger.info("Database connection closed. Goodbye!");
  });
