import { Router } from "express";
import { createReadStream, existsSync, statSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { tracks } from "../db/schema.js";

const router = Router();

const BITRATE_MAP: Record<string, string> = {
  high: "320k",
  medium: "160k",
  low: "96k",
};

router.get("/:trackId", async (req, res) => {
  const { trackId } = req.params;
  const quality = (req.query.quality as string) || "original";

  // Look up track in DB to get the stored filePath
  const track = await db
    .select({ filePath: tracks.filePath })
    .from(tracks)
    .where(eq(tracks.id, trackId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!track) {
    res.status(404).json({ error: `Track not found: ${trackId}` });
    return;
  }

  const filePath = resolve(process.cwd(), track.filePath);

  if (!existsSync(filePath)) {
    res.status(404).json({ error: `Track file not found: ${track.filePath}` });
    return;
  }

  // Transcode via ffmpeg for non-original quality
  if (quality !== "original") {
    const bitrate = BITRATE_MAP[quality];
    if (!bitrate) {
      res.status(400).json({ error: `Invalid quality: ${quality}` });
      return;
    }

    const seek = parseFloat(req.query.seek as string) || 0;
    const args = seek > 0
      ? ["-ss", String(seek), "-i", filePath, "-vn", "-f", "mp3", "-b:a", bitrate, "-"]
      : ["-i", filePath, "-vn", "-f", "mp3", "-b:a", bitrate, "-"];

    res.status(200);
    res.set({
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "none",
    });

    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

    let errData = "";
    proc.stderr?.on("data", (chunk: Buffer) => { errData += chunk.toString(); });

    proc.stdout?.pipe(res);

    req.on("close", () => {
      proc.kill();
    });

    proc.on("error", (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: "Transcoding failed", detail: err.message });
      }
    });

    proc.on("close", (code) => {
      if (code !== 0 && !res.headersSent) {
        res.status(500).json({ error: "Transcoding failed", detail: errData });
      }
    });
    return;
  }

  // Original quality — serve raw file directly
  const stat = statSync(filePath);
  const fileSize = stat.size;
  const mimeType = getMimeType(filePath);

  // Handle Range header for seeking (essential for audio players)
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.status(206);
    res.set({
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": mimeType,
    });

    const stream = createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    res.status(200);
    res.set({
      "Accept-Ranges": "bytes",
      "Content-Length": fileSize,
      "Content-Type": mimeType,
    });

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
});

function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    mp3: "audio/mpeg",
    flac: "audio/flac",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
    m4a: "audio/mp4",
    wma: "audio/x-ms-wma",
  };
  return mimeMap[ext ?? ""] || "application/octet-stream";
}

export default router;
