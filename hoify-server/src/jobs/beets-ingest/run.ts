/**
 * Beets Ingest — standalone entry point + programmable import.
 *
 * Usage (CLI):
 *   BEETS_INGEST_PATH=/path/to/ingest npx tsx src/jobs/beets-ingest/run.ts
 *   npm run ingest:beets
 *
 * Usage (programmatic):
 *   import { ingestAndScan } from "./jobs/beets-ingest/run.js";
 *   await ingestAndScan(ingestPath);
 */

import "dotenv/config";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { client } from "../../db/index.js";
import { connection } from "../../db/redis.js";
import { logger } from "../../util/logger.js";
import { scanLibrary } from "../library-scanner/scanner.js";

const SERVER_DIR = process.cwd();
const INGEST_PATH = resolve(
  process.env.BEETS_INGEST_PATH ?? resolve(SERVER_DIR, "ingest"),
);
const MUSIC_LIBRARY_PATH = resolve(
  process.env.MUSIC_LIBRARY_PATH ?? resolve(SERVER_DIR, "music"),
);
const BEETS_DIR = resolve(SERVER_DIR, ".beets");

function writeBeetsConfig(): string {
  const configPath = resolve(BEETS_DIR, "config.yaml");
  const config = `\
directory: ${MUSIC_LIBRARY_PATH}
library: ${resolve(BEETS_DIR, "library.db")}

import:
  copy: yes
  move: no
  link: no
  autotag: yes
  quiet: yes
  quiet_fallback: asis
  resume: yes
  timid: no

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

export function runBeetsImport(ingestPath: string): Promise<void> {
  mkdirSync(BEETS_DIR, { recursive: true });
  const beetsConfig = writeBeetsConfig();

  return new Promise((resolvePromise, reject) => {
    const proc = spawn("beet", ["-c", beetsConfig, "import", "-q", ingestPath], {
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

export async function ingestAndScan(ingestPath: string): Promise<void> {
  const hasAudio = await hasAudioFiles(ingestPath);
  if (!hasAudio) {
    logger.warn({ path: ingestPath }, "No audio files found in ingest directory — nothing to do");
    return;
  }

  logger.info("Running beets import...");
  await runBeetsImport(ingestPath);

  logger.info("Beets import complete. Scanning music library for DB insertion...");
  const summary = await scanLibrary(MUSIC_LIBRARY_PATH);

  logger.info(
    {
      filesFound: summary.filesFound,
      enqueued: summary.filesFound - summary.skipped,
      skipped: summary.skipped,
    },
    "=== Summary ===",
  );
}

async function main() {
  logger.info({ path: INGEST_PATH }, "=== Hoify Beets Ingest ===");

  if (!existsSync(INGEST_PATH)) {
    mkdirSync(INGEST_PATH, { recursive: true });
    logger.info({ path: INGEST_PATH }, "Created ingest directory");
  }

  await ingestAndScan(INGEST_PATH);
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
