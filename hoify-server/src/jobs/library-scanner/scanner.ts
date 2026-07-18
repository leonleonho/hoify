import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import { db } from "../../db/index.js";
import { libraryScanState } from "../../db/schema.js";
import { walkDirectory } from "./walker.js";
import { getEnrichmentQueue } from "../enrichment/queue.js";
import { logger } from "../../util/logger.js";
import type { ScanSummary } from "./types.js";

/** Stable BullMQ jobId from path+mtime (allows re-queue when file changes). */
export function enrichmentJobId(filePath: string, mtime: number): string {
  return createHash("sha256").update(`${filePath}:${mtime}`).digest("hex");
}

export async function scanLibrary(rootDir: string): Promise<ScanSummary> {
  logger.info({ rootDir }, "Scanning library");

  const knownFiles = new Map<string, number>();
  const rows = await db
    .select({
      filePath: libraryScanState.filePath,
      fileMtime: libraryScanState.fileMtime,
    })
    .from(libraryScanState);
  for (const r of rows) {
    knownFiles.set(r.filePath, r.fileMtime);
  }
  logger.info({ count: knownFiles.size }, "Known files in scan state");

  let enqueuedCount = 0;
  let skippedCount = 0;

  for await (const fp of walkDirectory(rootDir)) {
    const st = await stat(fp);
    const mtime = Math.floor(st.mtimeMs);

    if (knownFiles.get(fp) === mtime) {
      skippedCount++;
      continue;
    }

    await getEnrichmentQueue().add(
      "parse-track",
      { filePath: fp },
      { jobId: enrichmentJobId(fp, mtime) },
    );
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
