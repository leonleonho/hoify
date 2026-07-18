import type { DownloadStatus } from "./types.js";

/**
 * Map slskd transfer state strings to generic download statuses.
 * Examples: "Queued", "InProgress", "Completed, Succeeded", "Completed, Errored", "Cancelled"
 */
export function mapTransferStatus(state: string): DownloadStatus {
  const lower = state.toLowerCase();

  if (lower.includes("cancel")) return "cancelled";
  if (lower.includes("errored") || lower.includes("error") || lower.includes("failed")) {
    return "failed";
  }
  if (lower.includes("completed") && lower.includes("succeeded")) {
    return "completed";
  }
  if (lower.includes("completed")) {
    // Completed but not succeeded
    return "failed";
  }
  if (lower.includes("progress") || lower.includes("transferring") || lower.includes("initializing")) {
    return "downloading";
  }
  if (lower.includes("queued") || lower.includes("requested") || lower.includes("local")) {
    return "queued";
  }

  return "queued";
}

export function isTerminalStatus(status: DownloadStatus): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}
