import { Router } from "express";
import { createReadStream, existsSync } from "fs";
import { resolve } from "path";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { albums } from "../db/schema.js";

const router = Router();

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  tiff: "image/tiff",
};

router.get("/:filename", async (req, res) => {
  const { filename } = req.params;

  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    res.status(400).json({ error: "Missing file extension" });
    return;
  }

  const albumId = filename.slice(0, dotIndex);
  const ext = filename.slice(dotIndex + 1).toLowerCase();

  const album = await db
    .select({ coverUrl: albums.coverUrl })
    .from(albums)
    .where(eq(albums.id, albumId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!album) {
    res.status(404).json({ error: "Album not found" });
    return;
  }

  const artPath = resolve(
    process.env.ALBUM_ART_PATH ?? resolve(process.cwd(), "album-art"),
  );
  const filePath = resolve(artPath, filename);

  if (!filePath.startsWith(artPath)) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }

  if (!existsSync(filePath)) {
    res.status(404).json({ error: "Cover art file not found" });
    return;
  }

  const mimeType = EXT_TO_MIME[ext] ?? "application/octet-stream";

  res.status(200);
  res.set("Content-Type", mimeType);
  res.set("Cache-Control", "public, max-age=31536000, immutable");

  const stream = createReadStream(filePath);
  stream.pipe(res);
});

export default router;
