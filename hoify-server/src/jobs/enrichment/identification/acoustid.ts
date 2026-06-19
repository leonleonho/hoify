import { logger } from "../../../util/logger.js";
import type { AcoustidMatch } from "./types.js";

const ACOUSTID_API_URL = "https://api.acoustid.org/v2/lookup";
const MAX_REQUESTS_PER_SEC = 3;

let apiKeyMissingWarned = false;

// Rate limiter: sliding window, max 3 req/s
const requestTimestamps: number[] = [];

/** @internal exported for testing */
export function __testResetRateLimiter(): void {
  requestTimestamps.length = 0;
  apiKeyMissingWarned = false;
}

async function applyRateLimit(): Promise<void> {
  const now = Date.now();
  const windowStart = now - 1000;

  // Prune timestamps outside the 1s window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < windowStart) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= MAX_REQUESTS_PER_SEC) {
    const oldest = requestTimestamps[0];
    const waitMs = oldest + 1000 - now + 50; // +50ms buffer
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  requestTimestamps.push(Date.now());
}

function getApiKey(): string | null {
  const key = process.env.ACOUSTID_API_KEY;
  if (!key && !apiKeyMissingWarned) {
    logger.warn("ACOUSTID_API_KEY not set — AcoustID lookup disabled");
    apiKeyMissingWarned = true;
  }
  return key || null;
}

export async function lookupAcoustid(
  fingerprint: string,
  duration: number,
): Promise<AcoustidMatch | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const body = new URLSearchParams({
      client: apiKey,
      fingerprint,
      duration: String(duration),
      meta: "recordings",
    });

    await applyRateLimit();
    const response = await fetch(ACOUSTID_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      logger.warn({ status: response.status, body: text }, "AcoustID API error");
      return null;
    }

    const data = (await response.json()) as {
      status: string;
      results?: Array<{
        score: number;
        recordings?: Array<{ id: string }>;
      }>;
    };

    if (data.status !== "ok" || !data.results?.length) {
      logger.debug("AcoustID lookup returned no results");
      return null;
    }

    const sorted = data.results.toSorted((a, b) => b.score - a.score);
    const best = sorted[0];

    if (!best.recordings?.length) {
      logger.debug("AcoustID result has no recordings");
      return null;
    }

    const recording = best.recordings[0];
    logger.debug({ score: best.score, mbid: recording.id }, "AcoustID match found");
    return { recordingMbid: recording.id, score: best.score };
  } catch (err) {
    logger.warn({ error: (err as Error).message }, "AcoustID request failed");
    return null;
  }
}
