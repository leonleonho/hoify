/**
 * Beets Ingest — standalone entry point + programmable import.
 *
 * Usage (CLI):
 *   BEETS_INGEST_PATH=/path/to/ingest npx tsx src/jobs/beets-ingest/run.ts
 *   npm run ingest:beets
 *
 * Usage (programmatic):
 *   import { ingestDropZone } from "./jobs/beets-ingest/run.js";
 *   await ingestDropZone(ingestPath);
 *
 * After beets moves files into the music library, the library scanner watcher
 * enqueues enrichment — this module only runs beets.
 */

import "dotenv/config";
import { existsSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { client } from "../../db/index.js";
import { connection } from "../../db/redis.js";
import { logger } from "../../util/logger.js";
import {
  musicLibraryPath as MUSIC_LIBRARY_PATH,
  beetsDir as BEETS_DIR,
  ingestPath as INGEST_PATH,
} from "../../paths.js";
import { collapseImportRoots } from "./paths.js";
import { createCoalesceQueue } from "../../util/coalesceQueue.js";

const SERVER_DIR = process.cwd();

function writeBeetsConfig(): string {
  mkdirSync(BEETS_DIR, { recursive: true });
  const configPath = resolve(BEETS_DIR, "config.yaml");
  const config = `\
directory: ${MUSIC_LIBRARY_PATH}
library: ${resolve(BEETS_DIR, "library.db")}

import:
  copy: no
  move: yes
  link: no
  autotag: yes
  quiet: yes
  quiet_fallback: asis
  resume: yes
  timid: no
  duplicate_action: keep

paths:
  default: $albumartist/$album/$track $title
  singleton: Non-Album/$albumartist/$title
  comp: Compilations/$album/$track $title

threaded: yes
clutter:
  - Thumbs.db
  - .DS_Store
  - cover.jpg
  - folder.jpg

per_disc_numbering: yes
artist_credit: no
id3v23: no
asciify_paths: no
`;
  writeFileSync(configPath, config, "utf-8");
  return configPath;
}

export async function hasAudioFiles(dir: string): Promise<boolean> {
  const entries = await readdir(dir, { withFileTypes: true });
  const audioExts = new Set([".mp3", ".flac", ".wav", ".ogg", ".aac", ".m4a", ".wma"]);
  for (const e of entries) {
    if (e.isFile() && audioExts.has(e.name.slice(e.name.lastIndexOf(".")).toLowerCase())) {
      return true;
    }
    if (e.isDirectory()) {
      return hasAudioFiles(resolve(dir, e.name));
    }
  }
  return false;
}

function pathExistsWithAudio(importPath: string): boolean {
  if (!existsSync(importPath)) return false;
  try {
    const st = statSync(importPath);
    if (st.isFile()) {
      const ext = importPath.slice(importPath.lastIndexOf(".")).toLowerCase();
      return [".mp3", ".flac", ".wav", ".ogg", ".aac", ".m4a", ".wma"].includes(ext);
    }
    return true;
  } catch {
    return false;
  }
}

export function runBeetsImport(
  importPaths: string[],
  ingestRoot?: string,
): Promise<void> {
  writeBeetsConfig();
  const beetsConfig = resolve(BEETS_DIR, "config.yaml");
  const roots = collapseImportRoots(importPaths, ingestRoot).filter(
    pathExistsWithAudio,
  );

  if (roots.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolvePromise, reject) => {
    const proc = spawn("beet", ["-c", beetsConfig, "import", "-q", ...roots], {
      cwd: SERVER_DIR,
      env: {
        ...process.env,
        BEETSDIR: BEETS_DIR,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    proc.stdout?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n").filter(Boolean)) {
        logger.info({ source: "beets" }, line);
      }
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n").filter(Boolean)) {
        logger.warn({ source: "beets" }, line);
      }
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`beets import exited with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}

let currentIngestRoot = INGEST_PATH;

const ingestQueue = createCoalesceQueue({
  label: "Beets ingest",
  retryDelayMs: 5_000,
  run: async (batch) => {
    await ingestPaths(batch, currentIngestRoot);
  },
});

/**
 * Serialize ingest runs. Paths arriving while a run is in flight are coalesced
 * into follow-up path-scoped imports. Failed batches stay queued and retry.
 */
export function scheduleIngest(
  paths: string[],
  ingestRoot: string = INGEST_PATH,
): Promise<void> {
  currentIngestRoot = ingestRoot;
  return ingestQueue.schedule(paths);
}

/**
 * Path-scoped ingest: beets-import only. Enrichment is triggered by the music
 * library watcher when files appear under MUSIC_LIBRARY_PATH.
 */
export async function ingestPaths(
  importPaths: string[],
  ingestRoot: string = INGEST_PATH,
): Promise<void> {
  const roots = collapseImportRoots(importPaths, ingestRoot).filter(
    pathExistsWithAudio,
  );
  if (roots.length === 0) {
    logger.warn({ paths: importPaths }, "No importable paths — nothing to do");
    return;
  }

  logger.info({ roots }, "Running beets import on paths");
  await runBeetsImport(roots, ingestRoot);
  logger.info({ roots }, "Beets import complete");
}

/** Import the entire drop zone (boot / CLI). Enrichment is handled by the music library watcher. */
export async function ingestDropZone(ingestDir: string): Promise<void> {
  const hasAudio = await hasAudioFiles(ingestDir);
  if (!hasAudio) {
    logger.warn({ path: ingestDir }, "No audio files found in ingest directory — nothing to do");
    return;
  }

  logger.info("Running beets import...");
  await runBeetsImport([ingestDir]);
  logger.info("Beets import complete");
}

async function main() {
  logger.info({ path: INGEST_PATH }, "=== Hoify Beets Ingest ===");

  if (!existsSync(INGEST_PATH)) {
    mkdirSync(INGEST_PATH, { recursive: true });
    logger.info({ path: INGEST_PATH }, "Created ingest directory");
  }

  await ingestDropZone(INGEST_PATH);
}

const isMainModule = process.argv[1]?.endsWith("run.ts") || process.argv[1]?.endsWith("run.js");
if (isMainModule) {
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
}
