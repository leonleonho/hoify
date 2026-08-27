import { spawn } from "node:child_process";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { tracks } from "../../db/schema.js";
import { logger } from "../../util/logger.js";

/**
 * Loudness normalization (EBU R128 / ITU-R BS.1770).
 *
 * Perceived loudness is measured as *integrated LUFS* using ffmpeg's `ebur128`
 * filter. Gain toward a target reference level is then applied as a digital
 * gain multiplier at playback (the player folds it into its volume).
 */

/** Loudness target in LUFS — matches Spotify/iTunes-style normalization. */
const DEFAULT_TARGET_LUFS = -14;

export function loudnessTargetLufs(): number {
  const parsed = Number.parseFloat(process.env.LOUDNESS_TARGET_LUFS ?? "");
  return Number.isFinite(parsed) ? parsed : DEFAULT_TARGET_LUFS;
}

/** Hard bounds for the multiplier to avoid blowing up silent/clipped files. */
const MIN_GAIN_DB = -12;
const MAX_GAIN_DB = 12;
const MIN_MULTIPLIER = 0.25; // 10^(-12/20)
const MAX_MULTIPLIER = 4.0; // 10^(12/20)

/**
 * Compute the linear gain multiplier that brings `lufs` up to `target` LUFS.
 * Clamped and rounded so extreme files never get distorted or blown out.
 */
export function gainForLoudness(lufs: number, target = DEFAULT_TARGET_LUFS): number {
  const gainDb = Math.max(MIN_GAIN_DB, Math.min(MAX_GAIN_DB, target - lufs));
  const multiplier = 10 ** (gainDb / 20);
  const clamped = Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, multiplier));
  return Math.round(clamped * 10_000) / 10_000;
}

/**
 * Measure integrated loudness (LUFS) of an audio file with ffmpeg's ebur128
 * filter. Returns the integrated loudness, or `null` if analysis failed.
 */
export function analyzeLoudness(filePath: string): Promise<number | null> {
  return new Promise((resolve) => {
    // -t 180 bounds work on very long files; enough for accurate integrated loudness.
    const args = ["-nostdin", "-t", "180", "-i", filePath, "-filter_complex", "ebur128", "-f", "null", "-"];

    let stderr = "";
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    proc.on("error", (err) => {
      logger.warn({ filePath, error: err.message }, "ffmpeg loudness analysis failed to start");
      resolve(null);
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        logger.warn({ filePath, code }, "ffmpeg loudness analysis exited with error");
        resolve(null);
        return;
      }
      const lufs = parseIntegratedLoudness(stderr);
      if (lufs == null) {
        logger.warn({ filePath }, "Could not parse integrated loudness from ffmpeg output");
      }
      resolve(lufs);
    });
  });
}

/**
 * Parse the integrated loudness (LUFS) from ffmpeg's `ebur128` stderr output.
 * The filter prints per-window lines like `I: -15.3 LUFS`; the final summary
 * line carries the integrated value. We take the last match to grab the summary.
 */
export function parseIntegratedLoudness(stderr: string): number | null {
  const regex = /I:\s*(-?[\d.]+)\s*LUFS/;
  let match: RegExpMatchArray | null = null;
  let cursor = 0;
  while (cursor < stderr.length) {
    const found = stderr.slice(cursor).match(regex);
    if (!found || found.index == null) break;
    match = found;
    cursor += found.index + found[0].length;
  }
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

/** Store measured loudness + computed gain on the track row for the given file. */
export async function updateTrackLoudness(
  filePath: string,
  lufs: number,
  target = DEFAULT_TARGET_LUFS,
): Promise<void> {
  const gainMultiplier = gainForLoudness(lufs, target);
  await db
    .update(tracks)
    .set({ loudnessLufs: lufs, gainMultiplier })
    .where(eq(tracks.filePath, filePath));
  logger.debug({ filePath, lufs, gainMultiplier, target }, "Stored loudness/gain for track");
}
