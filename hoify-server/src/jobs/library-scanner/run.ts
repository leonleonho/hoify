/**
 * Library Scanner — standalone entry point.
 *
 * Usage:
 *   MUSIC_LIBRARY_PATH=/path/to/music npx tsx src/jobs/library-scanner/run.ts
 *   npm run scan:library
 */

import "dotenv/config";
import { client } from "../../db/index.js";
import { scanLibrary } from "./scanner.js";

const MUSIC_LIBRARY_PATH =
  process.env.MUSIC_LIBRARY_PATH ?? "./music";

async function main() {
  console.log("=== Hoify Library Scanner ===\n");
  console.log(`Music library path: ${MUSIC_LIBRARY_PATH}`);

  const summary = await scanLibrary(MUSIC_LIBRARY_PATH);

  console.log("=== Summary ===");
  console.log(`  Files found:   ${summary.filesFound}`);
  console.log(`  Files parsed:  ${summary.filesParsed}`);
  console.log(`  Errors:        ${summary.errors}`);
  console.log(`  Artists added: ${summary.counts.artists}`);
  console.log(`  Albums added:  ${summary.counts.albums}`);
  console.log(`  Tracks added:  ${summary.counts.tracks}`);
  console.log(`  Genres added:  ${summary.counts.genres}`);
  console.log("");
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
    console.log("Database connection closed. Goodbye!");
  });
