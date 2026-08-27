import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { tracks } from "../../db/schema.js";
import { getEnrichmentQueue } from "./queue.js";
import { logger } from "../../util/logger.js";

/**
 * Deterministic BullMQ jobId for a loudness-analysis job. Keyed on the file
 * path so duplicate enqueues (across restarts) coalesce on the same job.
 * BullMQ rejects custom IDs containing ":" — the bare hex digest avoids that.
 */
function loudnessJobId(filePath: string): string {
  return createHash("sha256").update(filePath).digest("hex");
}

/**
 * Enqueue loudness analysis for every track row that hasn't been measured yet.
 * Runs at startup so files imported before this feature (or whose analysis
 * failed) get caught up on the same enrichment queue.
 */
export async function enqueueMissingLoudness(): Promise<number> {
  const missing = await db
    .select({ id: tracks.id, filePath: tracks.filePath })
    .from(tracks)
    .where(isNull(tracks.gainMultiplier));

  const queue = getEnrichmentQueue();
  let enqueued = 0;
  let skipped = 0;

  for (const track of missing) {
    if (!existsSync(track.filePath)) {
      skipped++;
      continue;
    }
    await queue.add(
      "parse-track",
      { filePath: track.filePath },
      { jobId: loudnessJobId(track.filePath) },
    );
    enqueued++;
  }

  logger.info(
    { total: missing.length, enqueued, skipped },
    "Enqueued loudness backfill",
  );

  return enqueued;
}
