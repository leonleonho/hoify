import path from "node:path";
import type { DownloadPlugin, DownloadResult } from "./types.js";
import type { MusicRequestPayload } from "../types.js";
import { logger } from "../../../util/logger.js";

// ── Config ────────────────────────────────────────────────────────────────────

const SLSKD_URL = process.env.SLSKD_URL ?? "http://localhost:5030";
const SLSKD_API_KEY = process.env.SLSKD_API_KEY;
const SLSKD_DOWNLOAD_DIR = path.resolve(
  process.cwd(),
  process.env.SLSKD_DOWNLOAD_DIR ?? "ingest",
);
const SEARCH_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_CANDIDATES = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUDIO_EXTS = new Set([".flac", ".mp3", ".m4a", ".opus", ".ogg"]);

export function isAudioFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return [...AUDIO_EXTS].some((ext) => lower.endsWith(ext));
}

export function stripExt(filename: string): string {
  const lower = filename.toLowerCase();
  for (const ext of AUDIO_EXTS) {
    if (lower.endsWith(ext)) return filename.slice(0, -ext.length);
  }
  return filename;
}

const VARIANT_KEYWORDS = new Set([
  "remix", "instrumental", "cover", "live", "acoustic", "edit",
  "version", "radio", "extended", "demo", "reprise",
  "alternate", "remaster", "mono", "single", "explicit", "clean",
  "karaoke", "a cappella", "unplugged", "orchestral", "piano",
]);

function getVariantKeywords(name: string): Set<string> {
  const lower = name.toLowerCase();
  const found = new Set<string>();
  for (const kw of VARIANT_KEYWORDS) {
    if (lower.includes(kw)) found.add(kw);
  }
  return found;
}

/** Match song name to filename, rejecting variant versions (remix, live, etc.) when not requested */
export function nameMatches(filename: string, songName: string): boolean {
  const f = stripExt(filename).toLowerCase();
  const s = songName.toLowerCase();

  const fileVariants = getVariantKeywords(f);
  const songVariants = getVariantKeywords(s);

  // If user asked for specific variant(s), file must share at least one
  if (songVariants.size > 0) {
    const shared = [...songVariants].some((v) => fileVariants.has(v));
    if (!shared) return false;
  } else if (fileVariants.size > 0) {
    // User didn't ask for any variant — reject files that have one
    return false;
  }

  // Normalize: collapse whitespace, replace non-alphanumeric with space to split tokens
  const fn = f.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const sn = s.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  // Token overlap — at least one significant token must match
  const fTokens = new Set(fn.split(" ").filter((t) => t.length > 1));
  const sTokens = sn.split(" ").filter((t) => t.length > 1);

  return sTokens.some((token) => fTokens.has(token));
}

const FORMAT_RANK: Record<string, number> = {
  ".flac": 3,
  ".mp3": 2,
  ".m4a": 1,
  ".opus": 1,
  ".ogg": 1,
};

export function formatRank(filename: string): number {
  const lower = filename.toLowerCase();
  for (const ext of Object.keys(FORMAT_RANK)) {
    if (lower.endsWith(ext)) return FORMAT_RANK[ext];
  }
  return 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface SlskdFile {
  filename: string;
  size: number;
  bitDepth?: number;
  bitRate?: number;
  sampleRate?: number;
  extension?: string;
  isLocked?: boolean;
}

interface SearchResponse {
  username: string;
  files: SlskdFile[];
  hasFreeUploadSlot?: boolean;
  uploadSpeed?: number;
  queueLength?: number;
}

interface EnqueuedTransfer {
  id: number;
  username: string;
  filename: string;
  size: number;
  state: string;
}

interface SlskdState {
  username: string;
  transferIds: number[];
  files: Array<{ id: number; filename: string; size: number }>;
  pollStartedAt: string;
}

async function apiFetch<T>(
  urlPath: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (SLSKD_API_KEY) {
    headers["X-API-Key"] = SLSKD_API_KEY;
  }
  const res = await fetch(`${SLSKD_URL}${urlPath}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`slskd API ${res.status} for ${urlPath}: ${text}`);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

// ── SlskdPlugin ───────────────────────────────────────────────────────────────

export class SlskdPlugin implements DownloadPlugin {
  name = "slskd";
  enabled = true;
  resumeState?: unknown;
  saveState: (key: string, data: unknown) => Promise<void>;

  constructor(saveState: (key: string, data: unknown) => Promise<void>) {
    this.saveState = saveState;
  }

  async download(req: MusicRequestPayload): Promise<DownloadResult> {
    if (!req.songName) {
      return { success: false, error: "slskd requires songName" };
    }

    try {
      return await this.doDownload(req);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg, artistName: req.artistName, songName: req.songName }, "slskd plugin crashed");
      return { success: false, error: msg };
    }
  }

  // ── Phase A: search + find best file per candidate ─────────────────────────

  private async doDownload(req: MusicRequestPayload): Promise<DownloadResult> {
    const resumeState = this.resumeState as SlskdState | undefined;

    // Resume path — skip search/enqueue, just poll transfers
    if (resumeState?.transferIds?.length) {
      logger.info({ transferIds: resumeState.transferIds }, "Resuming slskd transfers from saved state");
      const succeeded = await this.resumePollTransfers(resumeState);
      if (succeeded.length > 0) {
        await this.saveState("slskd", null);
        return {
          success: true,
          filePath: SLSKD_DOWNLOAD_DIR,
          format: "mixed",
          fileCount: succeeded.length,
        };
      }
      // All transfers failed — fall through to re-search
      logger.info("Resumed transfers all failed, re-searching");
    }

    // Strip Discogs-style parenthetical numbers from artist name, e.g. "Lisa (456)" -> "Lisa"
    const cleanArtist = req.artistName.replace(/\s*\(\d+\)\s*$/, "");
    // Build search text: "Artist - Song"
    const searchText = `${cleanArtist} - ${req.songName}`;
    logger.info({ searchText }, "slskd search");

    const { id: searchId } = await apiFetch<{ id: string }>(
      "/api/v0/searches",
      {
        method: "POST",
        body: JSON.stringify({
          searchText,
          fileLimit: 200,
          filterResponses: true,
          searchTimeout: SEARCH_TIMEOUT_MS,
        }),
      },
    );

    // Poll search status until complete
    const searchDeadline = Date.now() + SEARCH_TIMEOUT_MS + 10_000;
    while (Date.now() < searchDeadline) {
      await sleep(3000);
      const status = await apiFetch<{ isComplete: boolean }>(
        `/api/v0/searches/${searchId}`,
      );
      if (status.isComplete) break;
    }

    const searchResponses = await apiFetch<SearchResponse[]>(
      `/api/v0/searches/${searchId}/responses?includeResponses=true`,
    );

    if (!searchResponses || searchResponses.length === 0) {
      logger.warn({ searchText }, "No search results from slskd");
      return { success: false, error: "no search results" };
    }

    logger.info({ resultCount: searchResponses.length }, "slskd search results received");

    // Group users by those who have the song, pick best file per user
    const userFiles: Array<{ username: string; file: SlskdFile; hasFreeUploadSlot?: boolean; uploadSpeed?: number; queueLength?: number }> = [];

    for (const resp of searchResponses) {
      if (!resp.files || resp.files.length === 0) continue;

      const matching = resp.files.filter(
        (f) => isAudioFile(f.filename) && nameMatches(f.filename, req.songName!),
      );
      if (matching.length === 0) continue;

      // Pick best file from this user (best format > any other criteria)
      const best = matching.sort((a, b) => formatRank(b.filename) - formatRank(a.filename))[0];
      userFiles.push({
        username: resp.username,
        file: best,
        hasFreeUploadSlot: resp.hasFreeUploadSlot,
        uploadSpeed: resp.uploadSpeed,
        queueLength: resp.queueLength,
      });
    }

    if (userFiles.length === 0) {
      logger.warn({ searchText }, "No users with matching song file");
      return { success: false, error: "no matching files found" };
    }

    // Score each candidate user
    const scored = userFiles
      .filter((u) => u.hasFreeUploadSlot !== false)
      .map((u) => {
        let score = 0;
        if (u.file.isLocked !== true) score += 2;
        score += 2; // matched song name
        if (formatRank(u.file.filename) >= 2) score += 1; // flac bonus
        const speedMBs = (u.uploadSpeed ?? 0) / 1_000_000;
        score += Math.min(speedMBs, 5);
        return { ...u, score };
      })
      .filter((u) => u.file.isLocked !== true)
      .sort((a, b) => b.score - a.score);

    const candidates = scored.slice(0, MAX_CANDIDATES);
    logger.info(
      { candidates: candidates.map((c) => ({ user: c.username, file: c.file.filename, score: c.score })) },
      "Download candidates ranked",
    );

    // ── Phase B: retry loop over candidates ──────────────────────────────────

    let succeeded = false;

    for (const candidate of candidates) {
      logger.info(
        { username: candidate.username, file: candidate.file.filename },
        "Queueing single file download",
      );

      try {
        const { enqueued } = await apiFetch<{
          enqueued: EnqueuedTransfer[];
          failed: unknown[];
        }>(
          `/api/v0/transfers/downloads/${encodeURIComponent(candidate.username)}`,
          {
            method: "POST",
            body: JSON.stringify([
              { filename: candidate.file.filename, size: candidate.file.size },
            ]),
          },
        );

        if (!enqueued || enqueued.length === 0) {
          logger.warn({ username: candidate.username }, "Transfer failed to enqueue");
          continue;
        }

        // Save state immediately after enqueue
        await this.saveState("slskd", {
          username: candidate.username,
          transferIds: enqueued.map((t: EnqueuedTransfer) => t.id),
          files: enqueued.map((t: EnqueuedTransfer) => ({
            id: t.id,
            filename: t.filename,
            size: t.size,
          })),
          pollStartedAt: new Date().toISOString(),
        } satisfies SlskdState);

        // Poll transfer
        const transferId = enqueued[0].id;
        const success = await this.pollSingleTransfer(candidate.username, transferId, candidate.file.filename);

        if (success) {
          succeeded = true;
          break;
        }
        // Peer cancelled — try next candidate for same file
        logger.info({ username: candidate.username, file: candidate.file.filename }, "Transfer failed, trying next candidate");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(
          { username: candidate.username, err: msg },
          "Candidate failed, trying next",
        );
      }
    }

    // Clear saved state
    await this.saveState("slskd", null);

    if (!succeeded) {
      return { success: false, error: "all candidate users failed" };
    }

    return {
      success: true,
      filePath: SLSKD_DOWNLOAD_DIR,
      format: "mixed",
      fileCount: 1,
    };
  }

  // ── Poll single transfer until completion / timeout ────────────────────────

  private async pollSingleTransfer(
    username: string,
    transferId: number,
    filename: string,
  ): Promise<boolean> {
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);

      try {
        const result = await apiFetch<{ state: string }>(
          `/api/v0/transfers/downloads/${encodeURIComponent(username)}/${transferId}`,
        );

        if (result.state === "Completed, Succeeded") {
          logger.info({ transferId, filename }, "Download completed");
          return true;
        }

        if (result.state === "Completed, Errored" || result.state === "Cancelled") {
          logger.warn({ transferId, state: result.state, filename }, "Transfer failed");
          return false;
        }
        // "Queued" / "InProgress" — keep polling
      } catch {
        // API hiccup, keep polling
      }
    }

    logger.warn({ transferId, filename }, "Poll timeout reached, transfer still pending");
    return false;
  }

  // ── Resume polling from saved state (all transfers) ────────────────────────

  private async resumePollTransfers(state: SlskdState): Promise<string[]> {
    const completed: string[] = [];
    const deadline = new Date(state.pollStartedAt).getTime() + POLL_TIMEOUT_MS;

    for (const file of state.files) {
      if (Date.now() >= deadline) {
        logger.warn({ file: file.filename }, "Resume deadline reached, stopping");
        break;
      }

      const ok = await this.pollSingleTransfer(state.username, file.id, file.filename);
      if (ok) completed.push(file.filename);
    }

    return completed;
  }
}
