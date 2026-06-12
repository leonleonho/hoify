import { stat } from "node:fs/promises";
import { db } from "../../db/index.js";
import { tracks } from "../../db/schema.js";
import { walkDirectory } from "./walker.js";
import { parseFile, PROGRESS_INTERVAL } from "./parser.js";
import { upsertAll } from "./upsert.js";
import type { ParsedTrack, ScanSummary } from "./types.js";

// ---------------------------------------------------------------------------
// Orchestrator: walk → filter → parse → upsert
// ---------------------------------------------------------------------------

export async function scanLibrary(rootDir: string): Promise<ScanSummary> {
  console.log(`\nScanning library: ${rootDir}`);

  // Pre-fetch known file paths + mtimes from DB
  const knownFiles = new Map<string, number>();
  const rows = await db
    .select({ filePath: tracks.filePath, fileMtime: tracks.fileMtime })
    .from(tracks);
  for (const r of rows) {
    if (r.fileMtime !== null) knownFiles.set(r.filePath, r.fileMtime);
  }
  console.log(`Known tracks in DB: ${knownFiles.size}`);

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

  console.log(
    `Found ${filePaths.length} audio files (skipped ${skippedCount} unchanged)\n`,
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
      console.log(`  Parsed ${i + 1}/${filePaths.length} files`);
    }
  }

  console.log(
    `\nParsing complete: ${parsed.length} OK, ${errors} failed\n`,
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
  console.log("Upserting into database...");
  const counts = await upsertAll(parsed);
  console.log("Upsert complete\n");

  return {
    filesFound: filePaths.length + skippedCount,
    filesParsed: parsed.length,
    errors,
    counts,
  };
}
