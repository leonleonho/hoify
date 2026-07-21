import { watch as chokidarWatch } from "chokidar";
import { logger } from "../../util/logger.js";
import { enqueueTracks } from "./scanner.js";
import { isAudioFile } from "./walker.js";

const DEBOUNCE_MS = 2_000;

let activeTimer: ReturnType<typeof setTimeout> | null = null;
const pendingPaths = new Set<string>();

let enqueueChain: Promise<void> = Promise.resolve();
const coalescedPaths = new Set<string>();

function scheduleEnqueue(paths: string[]): Promise<void> {
  for (const p of paths) coalescedPaths.add(p);

  enqueueChain = enqueueChain
    .then(async () => {
      while (coalescedPaths.size > 0) {
        const batch = [...coalescedPaths];
        coalescedPaths.clear();
        await enqueueTracks(batch);
      }
    })
    .catch((err) => {
      logger.error(err, "Library watcher enqueue failed");
    });

  return enqueueChain;
}

function flushPending() {
  activeTimer = null;
  const paths = [...pendingPaths];
  pendingPaths.clear();
  if (paths.length === 0) return;

  logger.info(
    { count: paths.length },
    "Music library changes detected — enqueueing enrichment",
  );
  scheduleEnqueue(paths);
}

function debounceEnqueue(eventPath: string) {
  if (!isAudioFile(eventPath)) return;
  pendingPaths.add(eventPath);
  if (activeTimer) clearTimeout(activeTimer);
  activeTimer = setTimeout(flushPending, DEBOUNCE_MS);
}

/**
 * Watch the music library for new/changed audio files and enqueue enrichment.
 * Beets moves and direct drops both flow through here — no ingest→scanner handoff.
 */
export function startWatchLibrary(musicDir: string): () => void {
  logger.info({ dir: musicDir }, "Starting file watcher on music library");

  const watcher = chokidarWatch(musicDir, {
    persistent: true,
    ignoreInitial: true,
    depth: 99,
    followSymlinks: false,
    // Beets may write then rename; wait until size stabilizes
    awaitWriteFinish: {
      stabilityThreshold: 1500,
      pollInterval: 100,
    },
  });

  watcher.on("add", (path) => debounceEnqueue(path));
  watcher.on("change", (path) => debounceEnqueue(path));

  return () => {
    if (activeTimer) clearTimeout(activeTimer);
    pendingPaths.clear();
    watcher.close().catch((err) => {
      logger.error(err, "Error closing music library watcher");
    });
  };
}
