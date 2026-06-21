import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { type MusicRequest, musicRequests } from "../../../db/schema.js";

export async function getRequest(requestId: string): Promise<MusicRequest | undefined> {
  const [row] = await db
    .select()
    .from(musicRequests)
    .where(eq(musicRequests.id, requestId));
  return row;
}

export async function setStatusDownloading(requestId: string): Promise<void> {
  await db
    .update(musicRequests)
    .set({ status: "downloading" })
    .where(eq(musicRequests.id, requestId));
}

export async function setCompleted(
  requestId: string,
  downloadPath?: string | null,
): Promise<void> {
  await db
    .update(musicRequests)
    .set({
      status: "completed",
      downloadPath: downloadPath ?? null,
      downloadMeta: null,
      pluginUsed: null,
    })
    .where(eq(musicRequests.id, requestId));
}

export async function setFailed(requestId: string): Promise<void> {
  await db
    .update(musicRequests)
    .set({
      status: "failed",
      downloadMeta: null,
      pluginUsed: null,
    })
    .where(eq(musicRequests.id, requestId));
}

export async function saveDownloadState(
  requestId: string,
  key: string,
  data: unknown,
): Promise<void> {
  await db
    .update(musicRequests)
    .set({ downloadMeta: data, pluginUsed: key })
    .where(eq(musicRequests.id, requestId));
}

export async function clearStaleState(requestId: string): Promise<void> {
  await db
    .update(musicRequests)
    .set({ downloadMeta: null, pluginUsed: null })
    .where(eq(musicRequests.id, requestId));
}
