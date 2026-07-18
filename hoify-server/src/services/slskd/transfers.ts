import { apiFetch } from "./client.js";
import type { EnqueuedTransfer, SlskdTransfer } from "./types.js";

export async function enqueueDownloads(
  peer: string,
  files: Array<{ filename: string; size: number }>,
): Promise<{ enqueued: EnqueuedTransfer[]; failed: unknown[] }> {
  return apiFetch<{ enqueued: EnqueuedTransfer[]; failed: unknown[] }>(
    `/api/v0/transfers/downloads/${encodeURIComponent(peer)}`,
    {
      method: "POST",
      body: JSON.stringify(files),
    },
  );
}

export async function getTransfer(
  peer: string,
  transferId: string | number,
): Promise<SlskdTransfer> {
  return apiFetch<SlskdTransfer>(
    `/api/v0/transfers/downloads/${encodeURIComponent(peer)}/${transferId}`,
  );
}
