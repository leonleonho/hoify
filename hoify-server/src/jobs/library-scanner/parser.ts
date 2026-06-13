import { stat } from "node:fs/promises";
import { parse } from "node:path";
import { parseFile as parseAudio } from "music-metadata";
import type { ParsedTrack } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PROGRESS_INTERVAL = 100;

// ---------------------------------------------------------------------------
// Parse a single audio file with music-metadata
// ---------------------------------------------------------------------------

export async function parseFile(filePath: string): Promise<ParsedTrack | null> {
  try {
    const [audio, fileStat] = await Promise.all([
      parseAudio(filePath),
      stat(filePath),
    ]);

    const { common, format } = audio;

    return {
      filePath,
      fileFormat: format.codec ?? parse(filePath).ext.slice(1),
      fileSize: fileStat.size,
      fileMtime: Math.floor(fileStat.mtimeMs),
      title: common.title ?? parse(filePath).name,
      artist: common.artist ?? "Unknown Artist",
      album: common.album ?? "Unknown Album",
      year: common.year && !Number.isNaN(common.year) ? common.year : null,
      trackNumber:
        common.track?.no && !Number.isNaN(common.track.no)
          ? common.track.no
          : null,
      discNumber:
        common.disk?.no && !Number.isNaN(common.disk.no)
          ? common.disk.no
          : 1,
      duration: format.duration ? Math.round(format.duration) : null,
      genreNames: common.genre ?? [],
    };
  } catch (err) {
    console.error(`  [SKIP] ${filePath}: ${(err as Error).message}`);
    return null;
  }
}
