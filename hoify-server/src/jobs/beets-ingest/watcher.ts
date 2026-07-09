import { watch as chokidarWatch } from "chokidar";
import { logger } from "../../util/logger.js";
import { ingestAndScan } from "./run.js";

const DEBOUNCE_MS = 2_000;

let activeTimer: ReturnType<typeof setTimeout> | null = null;

function flushPending(ingestDir: string) {
  activeTimer = null;

  logger.info("New files detected — running beets import on ingest directory");
  ingestAndScan(ingestDir).catch((err) => {
    logger.error(err, "Batch ingest failed");
  });
}

function debounceIngest(ingestDir: string) {
  if (activeTimer) clearTimeout(activeTimer);
  activeTimer = setTimeout(() => flushPending(ingestDir), DEBOUNCE_MS);
}

export function startWatchIngest(ingestDir: string): () => void {
  logger.info({ dir: ingestDir }, "Starting file watcher on ingest directory");

  const watcher = chokidarWatch(ingestDir, {
    persistent: true,
    ignoreInitial: true,
    depth: 99,
    // Don't follow symlinks to avoid importing outside the ingest dir
    followSymlinks: false,
  });

  // Listen for both new files AND new directories — a copied dir triggers addDir
  // then a flurry of add events for each file within.
  watcher.on("add", () => debounceIngest(ingestDir));
  watcher.on("addDir", () => debounceIngest(ingestDir));

  return () => {
    if (activeTimer) clearTimeout(activeTimer);
    watcher.close().catch((err) => {
      logger.error(err, "Error closing watcher");
    });
  };
}
