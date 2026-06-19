import { Worker } from "bullmq";
import { connection } from "./queue.js";
import { parseFile } from "./parser.js";
import { identify } from "./identification/identify.js";
import { upsertOne, saveAlbumArt } from "./storage/storageUtils.js";
import { logger } from "../../util/logger.js";
import type { EnqueuePayload } from "./types/types.js";

const CONCURRENCY = parseInt(
  process.env.ENRICHMENT_CONCURRENCY ?? "5",
  10,
);

let processedCount = 0;
let errorCount = 0;
let resolveDrain: (() => void) | null = null;
let drainPromise: Promise<void> | null = null;

export const enrichmentWorker = new Worker<EnqueuePayload>(
  "enrichment",
  async (job) => {
    const { filePath } = job.data;

    const parsed = await parseFile(filePath);
    if (!parsed) {
      errorCount++;
      return { success: false, error: "Parse failed" };
    }

    const enriched = await identify(filePath, parsed);
    const { albumId } = await upsertOne(enriched);

    if (enriched.embeddedPicture) {
      await saveAlbumArt(albumId, enriched.embeddedPicture);
    }

    processedCount++;

    return { success: true };
  },
  {
    connection,
    concurrency: CONCURRENCY,
  },
);

enrichmentWorker.on("completed", (job) => {
  logger.debug({ filePath: job.data.filePath }, "Enriched track");
});

enrichmentWorker.on("failed", (job, err) => {
  logger.warn(
    {
      filePath: job?.data.filePath,
      error: err.message,
      attempts: job?.attemptsMade,
    },
    "Enrichment job failed",
  );
});

enrichmentWorker.on("drained", () => {
  logger.info("Enrichment queue drained");
  if (resolveDrain) {
    resolveDrain();
    resolveDrain = null;
    drainPromise = null;
  }
});

export function waitForDrain(): Promise<void> {
  if (drainPromise) return drainPromise;
  drainPromise = new Promise((resolve) => {
    resolveDrain = resolve;
  });
  return drainPromise;
}

export function getCounts() {
  return { processed: processedCount, errors: errorCount };
}

export async function closeWorker(): Promise<void> {
  await enrichmentWorker.close();
}
