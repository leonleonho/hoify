import { stat } from "node:fs/promises";
import { db } from "../../db/index.js";
import { tracks } from "../../db/schema.js";
import { walkDirectory } from "./walker.js";
import { parseFile, PROGRESS_INTERVAL } from "./parser.js";
import { upsertAll } from "./upsert.js";
import { logger } from "../../util/logger.js";
import type { ParsedTrack, ScanSummary } from "./types.js";

// ---------------------------------------------------------------------------
// Orchestrator: walk → filter → parse → upsert
// ---------------------------------------------------------------------------

export async function scanLibrary(rootDir: string): Promise<ScanSummary> {
  logger.info({ rootDir }, "Scanning library");

  // Pre-fetch known file paths + mtimes from DB
  const knownFiles = new Map<string, number>();
  const rows = await db
    .select({ filePath: tracks.filePath, fileMtime: tracks.fileMtime })
    .from(tracks);
  for (const r of rows) {
    if (r.fileMtime !== null) knownFiles.set(r.filePath, r.fileMtime);
  }
  logger.info({ count: knownFiles.size }, "Known tracks in DB");

  // Walk directory tree, stat each file, skip if mtime unchanged
  const filePaths: string[] = [];
  let skippedCount = 0;

  for await (const fp of walkDirectory(rootDir)) {
    const st = await stat(fp);
    const mtime = Math.floor(st.mtimeMs);

    if (knownFiles.get(fp) === mtime) {
      skippedCount++;
      continue;
    }
    filePaths.push(fp);
  }

  logger.info(
    { found: filePaths.length, skipped: skippedCount },
    `Found ${filePaths.length} audio files (skipped ${skippedCount} unchanged)`,
  );

  if (filePaths.length === 0) {
    return {
      filesFound: skippedCount,
      filesParsed: 0,
      errors: 0,
      counts: { artists: 0, albums: 0, tracks: 0, genres: 0 },
    };
  }

  // Parse files
  const parsed: ParsedTrack[] = [];
  let errors = 0;

  for (let i = 0; i < filePaths.length; i++) {
    const result = await parseFile(filePaths[i]);

    if (result) {
      parsed.push(result);
    } else {
      errors++;
    }

    if ((i + 1) % PROGRESS_INTERVAL === 0) {
      logger.debug({ parsed: i + 1, total: filePaths.length }, "Parsing progress");
    }
  }

  logger.info(
    { ok: parsed.length, errors },
    `Parsing complete: ${parsed.length} OK, ${errors} failed`,
  );

  if (parsed.length === 0) {
    return {
      filesFound: filePaths.length + skippedCount,
      filesParsed: 0,
      errors,
      counts: { artists: 0, albums: 0, tracks: 0, genres: 0 },
    };
  }

  // Upsert
  logger.info("Upserting into database...");
  const counts = await upsertAll(parsed);
  logger.info({ counts }, "Upsert complete");

  return {
    filesFound: filePaths.length + skippedCount,
    filesParsed: parsed.length,
    errors,
    counts,
  };
}
