import { watch as chokidarWatch } from "chokidar";
import { logger } from "../../util/logger.js";
import { scheduleIngest } from "./run.js";

const DEBOUNCE_MS = 2_000;

let activeTimer: ReturnType<typeof setTimeout> | null = null;
const pendingPaths = new Set<string>();

function flushPending(ingestDir: string) {
  activeTimer = null;
  const paths = [...pendingPaths];
  pendingPaths.clear();

  if (paths.length === 0) return;

  logger.info({ count: paths.length }, "New files detected — running path-scoped beets import");
  scheduleIngest(paths, ingestDir).catch((err) => {
    logger.error(err, "Batch ingest failed");
  });
}

function debounceIngest(eventPath: string, ingestDir: string) {
  pendingPaths.add(eventPath);
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
  watcher.on("add", (path) => debounceIngest(path, ingestDir));
  watcher.on("addDir", (path) => debounceIngest(path, ingestDir));

  return () => {
    if (activeTimer) clearTimeout(activeTimer);
    pendingPaths.clear();
    watcher.close().catch((err) => {
      logger.error(err, "Error closing watcher");
    });
  };
}
