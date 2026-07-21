import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import { db } from "../../db/index.js";
import { libraryScanState } from "../../db/schema.js";
import { walkDirectory } from "./walker.js";
import { getEnrichmentQueue } from "../enrichment/queue.js";
import { recordScanState } from "../enrichment/storage/scanState.js";
import { logger } from "../../util/logger.js";
import type { ScanSummary } from "./types.js";

/** Stable BullMQ jobId from path+mtime (allows re-queue when file changes). */
export function enrichmentJobId(filePath: string, mtime: number): string {
  return createHash("sha256").update(`${filePath}:${mtime}`).digest("hex");
}

async function loadKnownFiles(): Promise<Map<string, number>> {
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
  return knownFiles;
}

/**
 * Enqueue enrichment for the given file paths, skipping unchanged path+mtime pairs.
 * Records `pending` in library_scan_state at enqueue time so overlapping scans do not re-queue.
 */
export async function enqueueTracks(filePaths: string[]): Promise<ScanSummary> {
  const knownFiles = await loadKnownFiles();
  logger.info({ count: knownFiles.size }, "Known files in scan state");

  let enqueuedCount = 0;
  let skippedCount = 0;
  let errors = 0;

  for (const fp of filePaths) {
    let mtime: number;
    try {
      const st = await stat(fp);
      mtime = Math.floor(st.mtimeMs);
    } catch (err) {
      logger.warn({ filePath: fp, err }, "Skipping path — could not stat");
      errors++;
      continue;
    }

    if (knownFiles.get(fp) === mtime) {
      skippedCount++;
      continue;
    }

    await getEnrichmentQueue().add(
      "parse-track",
      { filePath: fp },
      { jobId: enrichmentJobId(fp, mtime) },
    );
    await recordScanState(fp, mtime, "pending");
    knownFiles.set(fp, mtime);
    enqueuedCount++;
  }

  logger.info(
    { enqueued: enqueuedCount, skipped: skippedCount, errors },
    `Enqueued ${enqueuedCount} tracks (skipped ${skippedCount} unchanged)`,
  );

  return {
    filesFound: enqueuedCount + skippedCount,
    filesParsed: 0,
    skipped: skippedCount,
    errors,
    counts: { artists: 0, albums: 0, tracks: 0, genres: 0 },
  };
}

export async function scanLibrary(rootDir: string): Promise<ScanSummary> {
  logger.info({ rootDir }, "Scanning library");

  const paths: string[] = [];
  for await (const fp of walkDirectory(rootDir)) {
    paths.push(fp);
  }

  return enqueueTracks(paths);
}
