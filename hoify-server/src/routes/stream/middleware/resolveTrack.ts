import { existsSync } from "fs";
import { resolve } from "path";
import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { tracks } from "../../../db/schema.js";
import type { Request, Response, NextFunction } from "express";

export interface TrackInfo {
  filePath: string;
}

declare module "express-serve-static-core" {
  interface Request {
    trackInfo?: TrackInfo;
  }
}

export async function resolveTrack(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { trackId } = req.params;

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

  req.trackInfo = { filePath };
  next();
}
