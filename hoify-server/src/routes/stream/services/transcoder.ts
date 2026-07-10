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

  return {
    pipeTo(res: Response) {
      proc.stdout?.pipe(res);

      res.on("close", doKill);

      // Periodic health check polls response state instead of stdout data.
      // Stdout data pauses under backpressure, making data-event timer unreliable.
      // This catches silent client drops without false-triggering on normal buffering.
      const checkHealth = () => {
        if (killed) return;
        if (res.errored || res.destroyed || res.writableEnded || res.closed) {
          doKill();
        } else {
          idleTimer = setTimeout(checkHealth, IDLE_TIMEOUT_MS).unref();
        }
      };
      idleTimer = setTimeout(checkHealth, IDLE_TIMEOUT_MS).unref();
    },
    kill: doKill,
  };
}
