import { stat } from "node:fs/promises";
import { db } from "../../db/index.js";
import { tracks } from "../../db/schema.js";
import { walkDirectory } from "./walker.js";
import { enrichmentQueue } from "../enrichment/queue.js";
import { logger } from "../../util/logger.js";
import type { ScanSummary } from "./types.js";

export async function scanLibrary(rootDir: string): Promise<ScanSummary> {
  logger.info({ rootDir }, "Scanning library");

  const knownFiles = new Map<string, number>();
  const rows = await db
    .select({ filePath: tracks.filePath, fileMtime: tracks.fileMtime })
    .from(tracks);
  for (const r of rows) {
    if (r.fileMtime !== null) knownFiles.set(r.filePath, r.fileMtime);
  }
  logger.info({ count: knownFiles.size }, "Known tracks in DB");

  let enqueuedCount = 0;
  let skippedCount = 0;

  for await (const fp of walkDirectory(rootDir)) {
    const st = await stat(fp);
    const mtime = Math.floor(st.mtimeMs);

    if (knownFiles.get(fp) === mtime) {
      skippedCount++;
      continue;
    }

    await enrichmentQueue.add("parse-track", { filePath: fp });
    enqueuedCount++;
  }

  logger.info(
    { enqueued: enqueuedCount, skipped: skippedCount },
    `Enqueued ${enqueuedCount} tracks (skipped ${skippedCount} unchanged)`,
  );

  return {
    filesFound: enqueuedCount + skippedCount,
    filesParsed: 0,
    skipped: skippedCount,
    errors: 0,
    counts: { artists: 0, albums: 0, tracks: 0, genres: 0 },
  };
}
