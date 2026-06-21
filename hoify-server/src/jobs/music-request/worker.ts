import { Worker } from "bullmq";
import { connection } from "./queue.js";
import { logger } from "../../util/logger.js";
import type { MusicRequestPayload } from "./types.js";
import { getEnabledPlugins } from "./plugins/registry.js";
import {
  getRequest,
  setStatusDownloading,
  setCompleted,
  setFailed,
  saveDownloadState,
  clearStaleState,
} from "./util/db.js";

const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export const musicRequestWorker = new Worker<MusicRequestPayload>(
  "music-request",
  async (job) => {
    const { requestId, artistName, albumName, songName } = job.data;

    logger.info({ artistName, albumName, songName }, "Music request received");

    // Check for saved download state from a previous run
    const row = await getRequest(requestId);

    if (!row) {
      logger.error({ requestId }, "Music request row not found");
      return;
    }

    let shouldResume = false;
    if (row.downloadMeta && row.pluginUsed) {
      const meta = row.downloadMeta as { pollStartedAt?: string } | null;
      if (meta?.pollStartedAt) {
        const elapsed = Date.now() - new Date(meta.pollStartedAt).getTime();
        if (elapsed < POLL_TIMEOUT_MS + 30_000) {
          shouldResume = true;
        } else {
          logger.info({ requestId }, "Saved state expired, starting fresh");
          await clearStaleState(requestId);
        }
      }
    }

    const saveState = (key: string, data: unknown) =>
      saveDownloadState(requestId, key, data);

    const plugins = await getEnabledPlugins(saveState);

    for (const plugin of plugins) {
      if (shouldResume && plugin.name !== row.pluginUsed) continue;

      if (shouldResume) {
        plugin.resumeState = row.downloadMeta;
      }

      await setStatusDownloading(requestId);

      logger.info({ plugin: plugin.name, artistName, albumName }, "Plugin attempting download");
      const result = await plugin.download(job.data);

      if (result.success) {
        await setCompleted(requestId, result.filePath);
        return;
      }

      logger.warn({ plugin: plugin.name, error: result.error }, "Plugin download failed");
    }

    await setFailed(requestId);
  },
  {
    connection,
    concurrency: 5,
  },
);

musicRequestWorker.on("completed", (job) => {
  logger.debug({ requestId: job.data.requestId }, "Music request completed");
});

musicRequestWorker.on("failed", (job, err) => {
  logger.warn(
    { requestId: job?.data.requestId, error: err.message, attempts: job?.attemptsMade },
    "Music request failed",
  );
});

export async function closeWorker(): Promise<void> {
  await musicRequestWorker.close();
}
