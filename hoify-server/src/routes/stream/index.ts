import { Router } from "express";
import { resolveTrack } from "./middleware/resolveTrack.js";
import { getBitrate, spawnTranscoder } from "./services/transcoder.js";
import { serveRawFile } from "./services/fileServer.js";

const router = Router();

router.get("/:trackId", resolveTrack, (req, res) => {
  const quality = (req.query.quality as string) || "original";
  const { filePath } = req.trackInfo!;

  if (quality !== "original") {
    const bitrate = getBitrate(quality);
    if (!bitrate) {
      res.status(400).json({ error: `Invalid quality: ${quality}` });
      return;
    }

    const seek = parseFloat(req.query.seek as string) || 0;

    res.status(200);
    res.set({
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "none",
    });

    const tc = spawnTranscoder(filePath, bitrate, seek);
    tc.pipeTo(res);
    return;
  }

  serveRawFile(res, filePath, req.headers.range);
});

export default router;
