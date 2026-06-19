import { promisify } from "node:util";
import { exec } from "node:child_process";
import fpcalc from "fpcalc";
import { logger } from "../../../util/logger.js";
import type { FingerprintResult } from "./types.js";

const execAsync = promisify(exec);
const runFpcalcRaw = promisify(fpcalc);

let fpcalcAvailable: boolean | null = null;

/** @internal exported for testing */
export function __testResetCache(): void {
  fpcalcAvailable = null;
}

async function checkFpcalc(): Promise<boolean> {
  if (fpcalcAvailable !== null) return fpcalcAvailable;

  try {
    await execAsync("which fpcalc", { timeout: 2000 });
    fpcalcAvailable = true;
  } catch {
    logger.warn("fpcalc not found on PATH — install chromaprint for AcoustID fingerprinting");
    fpcalcAvailable = false;
  }
  return fpcalcAvailable;
}

export async function getFingerprint(filePath: string): Promise<FingerprintResult | null> {
  const available = await checkFpcalc();
  if (!available) return null;

  try {
    const result = (await runFpcalcRaw(filePath)) as { fingerprint: string; duration: number };
    return {
      fingerprint: result.fingerprint,
      duration: result.duration,
    };
  } catch (err) {
    logger.warn({ filePath, error: (err as Error).message }, "fpcalc failed");
    return null;
  }
}
