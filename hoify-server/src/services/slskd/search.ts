import { apiFetch } from "./client.js";
import {
  SEARCH_TIMEOUT_MS,
  compareFilesByQuality,
  fileExtension,
  fileQualityScore,
  folderNameFromPath,
  isAudioFile,
} from "./helpers.js";
import type {
  DownloadSearchFile,
  DownloadSearchFolder,
  DownloadSearchPeer,
  SlskdFile,
  SlskdSearchResponse,
  SlskdSearchStatus,
} from "./types.js";

/** Local start times so we can enforce the 15s cap without relying on slskd. */
const searchStartedAt = new Map<string, number>();

export async function startSearch(query: string): Promise<{ id: string }> {
  const result = await apiFetch<{ id: string }>("/api/v0/searches", {
    method: "POST",
    body: JSON.stringify({
      searchText: query,
      fileLimit: 200,
      filterResponses: true,
      searchTimeout: SEARCH_TIMEOUT_MS,
    }),
  });
  searchStartedAt.set(result.id, Date.now());
  return result;
}

export async function getSearchStatus(id: string): Promise<SlskdSearchStatus> {
  return apiFetch<SlskdSearchStatus>(`/api/v0/searches/${id}`);
}

export async function getSearchResponses(
  id: string,
): Promise<SlskdSearchResponse[]> {
  const responses = await apiFetch<SlskdSearchResponse[]>(
    `/api/v0/searches/${id}/responses?includeResponses=true`,
  );
  return responses ?? [];
}

function toSearchFile(file: SlskdFile): DownloadSearchFile {
  return {
    filename: file.filename,
    size: file.size,
    extension: file.extension ?? fileExtension(file.filename),
    bitRate: file.bitRate ?? null,
    bitDepth: file.bitDepth ?? null,
    sampleRate: file.sampleRate ?? null,
    isLocked: file.isLocked ?? null,
  };
}

function bestFileScore(files: DownloadSearchFile[]): number {
  if (files.length === 0) return 0;
  return Math.max(...files.map((f) => fileQualityScore(f)));
}

function peerScore(peer: DownloadSearchPeer): number {
  let score = bestFileScore(peer.folders.flatMap((f) => f.files));
  if (peer.hasFreeUploadSlot === true) score += 50_000;
  if (peer.hasFreeUploadSlot === false) score -= 50_000;
  score += Math.min((peer.uploadSpeed ?? 0) / 1_000, 5_000);
  score -= Math.min(peer.queueLength ?? 0, 100) * 10;
  return score;
}

export function groupByPeerAndFolder(
  responses: SlskdSearchResponse[],
): DownloadSearchPeer[] {
  const peers: DownloadSearchPeer[] = [];

  for (const resp of responses) {
    if (!resp.files?.length) continue;

    const audioFiles = resp.files.filter(
      (f) => isAudioFile(f.filename) && f.isLocked !== true,
    );
    if (audioFiles.length === 0) continue;

    const folderMap = new Map<string, DownloadSearchFile[]>();
    for (const file of audioFiles) {
      const folder = folderNameFromPath(file.filename);
      const list = folderMap.get(folder) ?? [];
      list.push(toSearchFile(file));
      folderMap.set(folder, list);
    }

    const folders: DownloadSearchFolder[] = [...folderMap.entries()].map(
      ([name, files]) => ({
        name,
        files: [...files].sort(compareFilesByQuality),
      }),
    );

    folders.sort((a, b) => {
      const qualityDiff = bestFileScore(b.files) - bestFileScore(a.files);
      if (qualityDiff !== 0) return qualityDiff;
      return b.files.length - a.files.length;
    });

    peers.push({
      peer: resp.username,
      hasFreeUploadSlot: resp.hasFreeUploadSlot ?? null,
      uploadSpeed: resp.uploadSpeed ?? null,
      queueLength: resp.queueLength ?? null,
      folders,
    });
  }

  peers.sort((a, b) => peerScore(b) - peerScore(a));
  return peers;
}

export function isSearchTimedOut(
  searchId: string,
  startedAt: string | undefined | null,
): boolean {
  const localStart = searchStartedAt.get(searchId);
  if (localStart != null) {
    return Date.now() - localStart >= SEARCH_TIMEOUT_MS;
  }
  if (!startedAt) return false;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return false;
  return Date.now() - start >= SEARCH_TIMEOUT_MS;
}

export function clearSearchStart(searchId: string): void {
  searchStartedAt.delete(searchId);
}
