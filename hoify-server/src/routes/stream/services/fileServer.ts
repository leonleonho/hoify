import { createReadStream, statSync } from "fs";
import type { Response } from "express";

const MIME_MAP: Record<string, string> = {
  mp3: "audio/mpeg",
  flac: "audio/flac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
  m4a: "audio/mp4",
  wma: "audio/x-ms-wma",
};

export function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return MIME_MAP[ext ?? ""] || "application/octet-stream";
}

export function serveRawFile(
  res: Response,
  filePath: string,
  rangeHeader: string | undefined,
): void {
  const stat = statSync(filePath);
  const fileSize = stat.size;
  const mimeType = getMimeType(filePath);

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, "").split("-");
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

    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.status(200);
    res.set({
      "Accept-Ranges": "bytes",
      "Content-Length": fileSize,
      "Content-Type": mimeType,
    });

    createReadStream(filePath).pipe(res);
  }
}
