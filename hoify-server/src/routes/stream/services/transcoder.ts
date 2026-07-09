import { spawn } from "child_process";
import type { Response } from "express";

const IDLE_TIMEOUT_MS = 60_000;
const KILL_GRACE_MS = 5_000;

const BITRATE_MAP: Record<string, string> = {
  high: "320k",
  medium: "160k",
  low: "96k",
};

export function getBitrate(quality: string): string | undefined {
  return BITRATE_MAP[quality];
}

export interface TranscodeResult {
  pipeTo(res: Response): void;
  kill(): void;
}

export function spawnTranscoder(
  filePath: string,
  bitrate: string,
  seek: number,
): TranscodeResult {
  const args = seek > 0
    ? ["-ss", String(seek), "-i", filePath, "-vn", "-f", "mp3", "-b:a", bitrate, "-"]
    : ["-i", filePath, "-vn", "-f", "mp3", "-b:a", bitrate, "-"];

  const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

  let killed = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (!killed) idleTimer = setTimeout(doKill, IDLE_TIMEOUT_MS).unref();
  };

  const doKill = () => {
    if (killed) return;
    killed = true;
    if (idleTimer) clearTimeout(idleTimer);
    proc.stdout?.unpipe();
    proc.kill("SIGTERM");
    setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch { /* already dead */ }
    }, KILL_GRACE_MS).unref();
  };

  proc.stdout?.on("data", resetIdleTimer);
  resetIdleTimer();

  return {
    pipeTo(res: Response) {
      proc.stdout?.pipe(res);

      res.on("close", doKill);
    },
    kill: doKill,
  };
}
