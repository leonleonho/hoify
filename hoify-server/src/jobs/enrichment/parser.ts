import { stat } from "node:fs/promises";
import { parse } from "node:path";
import { parseFile as parseAudio } from "music-metadata";
import { logger } from "../../util/logger.js";
import type { ParsedTrack, ArtData } from "./types/types.js";

export async function parseFile(filePath: string): Promise<ParsedTrack | null> {
  try {
    const [audio, fileStat] = await Promise.all([
      parseAudio(filePath),
      stat(filePath),
    ]);

    const { common, format } = audio;

    let embeddedPicture: ArtData | undefined;

    if (common.picture && common.picture.length > 0) {
      const frontCover = common.picture.find(
        (p) => p.type?.toLowerCase().includes("front"),
      );
      const pic = frontCover ?? common.picture[0];
      embeddedPicture = {
        data: Buffer.from(pic.data),
        format: pic.format,
      };
    }

    return {
      filePath,
      fileFormat: format.codec ?? parse(filePath).ext.slice(1),
      embeddedPicture,
      fileSize: fileStat.size,
      fileMtime: Math.floor(fileStat.mtimeMs),
      title: common.title ?? parse(filePath).name,
      artist: common.artist ?? "Unknown Artist",
      albumArtist: common.albumartist ?? common.artist ?? "Unknown Artist",
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
      aliases: [],
      albumAliases: [],
      artistAliases: [],
    };
  } catch (err) {
    logger.warn({ filePath, error: (err as Error).message }, "Skipped unparseable file");
    return null;
  }
}
