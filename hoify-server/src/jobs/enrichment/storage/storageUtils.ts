import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  artists,
  albums,
  tracks,
  genres,
  trackGenres,
} from "../../../db/schema.js";
import { logger } from "../../../util/logger.js";
import type { ParsedTrack, ArtData } from "../types/types.js";

export async function upsertOne(track: ParsedTrack): Promise<{ albumId: string }> {
  // --- Genres: upsert, then build lookup ---
  const allGenreNames = [...new Set(track.genreNames)].filter(Boolean);
  const genreByName = new Map<string, string>();

  if (allGenreNames.length > 0) {
    await db
      .insert(genres)
      .values(allGenreNames.map((name) => ({ name })))
      .onConflictDoNothing();

    const allGenres = await db
      .select()
      .from(genres)
      .where(inArray(genres.name, allGenreNames));

    for (const g of allGenres) {
      genreByName.set(g.name, g.id);
    }
  }

  // --- Artist: insert with onConflictDoNothing, then select ---
  let artistId: string;
  const [inserted] = await db
    .insert(artists)
    .values({ name: track.artist })
    .onConflictDoNothing()
    .returning({ id: artists.id });

  if (inserted) {
    artistId = inserted.id;
  } else {
    const [existing] = await db
      .select({ id: artists.id })
      .from(artists)
      .where(eq(artists.name, track.artist))
      .limit(1);
    artistId = existing!.id;
  }

  // --- Album: find or create by (title, artistId) ---
  let albumId: string;
  const [existingAlbum] = await db
    .select({ id: albums.id })
    .from(albums)
    .where(and(eq(albums.title, track.album), eq(albums.artistId, artistId)))
    .limit(1);

  if (existingAlbum) {
    albumId = existingAlbum.id;
  } else {
    const [inserted] = await db
      .insert(albums)
      .values({ title: track.album, artistId, releaseYear: track.year })
      .onConflictDoNothing()
      .returning({ id: albums.id });

    if (inserted) {
      albumId = inserted.id;
    } else {
      const [other] = await db
        .select({ id: albums.id })
        .from(albums)
        .where(
          and(eq(albums.title, track.album), eq(albums.artistId, artistId)),
        )
        .limit(1);
      albumId = other!.id;
    }
  }

  // --- Album aliases: update when we have release aliases ---
  if (track.albumAliases.length > 0) {
    await db
      .update(albums)
      .set({ aliases: track.albumAliases })
      .where(eq(albums.id, albumId));
  }

  // --- Track: find by filePath -> update or insert ---
  const [existingTrack] = await db
    .select()
    .from(tracks)
    .where(eq(tracks.filePath, track.filePath))
    .limit(1);

  let trackId: string;

  if (existingTrack) {
    trackId = existingTrack.id;
    const changed =
      existingTrack.title !== track.title ||
      existingTrack.albumId !== albumId ||
      existingTrack.trackNumber !== track.trackNumber ||
      existingTrack.discNumber !== track.discNumber ||
      existingTrack.duration !== track.duration ||
      existingTrack.fileSize !== track.fileSize ||
      existingTrack.fileFormat !== track.fileFormat ||
      existingTrack.fileMtime !== track.fileMtime;

    if (changed) {
      await db
        .update(tracks)
        .set({
          title: track.title,
          albumId,
          trackNumber: track.trackNumber,
          discNumber: track.discNumber,
          duration: track.duration,
          fileSize: track.fileSize,
          fileFormat: track.fileFormat,
          fileMtime: track.fileMtime,
          ...(track.acoustidFingerprint !== undefined && { acoustidFingerprint: track.acoustidFingerprint }),
          ...(track.musicbrainzRecordingId !== undefined && { musicbrainzRecordingId: track.musicbrainzRecordingId }),
          ...(track.musicbrainzArtistId !== undefined && { musicbrainzArtistId: track.musicbrainzArtistId }),
          ...(track.musicbrainzAlbumId !== undefined && { musicbrainzAlbumId: track.musicbrainzAlbumId }),
          aliases: track.aliases,
        })
        .where(eq(tracks.id, trackId));
    }
  } else {
    const [inserted] = await db
      .insert(tracks)
      .values({
        title: track.title,
        albumId,
        trackNumber: track.trackNumber,
        discNumber: track.discNumber,
        duration: track.duration,
        filePath: track.filePath,
        fileFormat: track.fileFormat,
        fileSize: track.fileSize,
        fileMtime: track.fileMtime,
        acoustidFingerprint: track.acoustidFingerprint ?? null,
        musicbrainzRecordingId: track.musicbrainzRecordingId ?? null,
        musicbrainzArtistId: track.musicbrainzArtistId ?? null,
        musicbrainzAlbumId: track.musicbrainzAlbumId ?? null,
        aliases: track.aliases,
      })
      .returning({ id: tracks.id });
    trackId = inserted.id;
  }

  // --- Track-Genre links: replace all for this track ---
  if (track.genreNames.length > 0) {
    const genreIds = track.genreNames
      .map((name) => genreByName.get(name))
      .filter((id): id is string => !!id);

    if (genreIds.length > 0) {
      await db
        .delete(trackGenres)
        .where(eq(trackGenres.trackId, trackId));

      await db
        .insert(trackGenres)
        .values(genreIds.map((genreId) => ({ trackId, genreId })));
    }
  }

  return { albumId };
}

const ART_PATH = resolve(
  process.env.ALBUM_ART_PATH ?? resolve(process.cwd(), "album-art"),
);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
};

function mimeToExt(mime: string): string {
  return MIME_TO_EXT[mime] ?? "jpg";
}

export async function saveAlbumArt(
  albumId: string,
  artData: ArtData,
): Promise<void> {
  // Skip if album already has cover art
  const [album] = await db
    .select({ coverUrl: albums.coverUrl })
    .from(albums)
    .where(eq(albums.id, albumId))
    .limit(1);

  if (album?.coverUrl) {
    logger.debug({ albumId }, "Album art already exists — skipping");
    return;
  }

  const ext = mimeToExt(artData.format);
  const fileName = `${albumId}.${ext}`;
  const filePath = resolve(ART_PATH, fileName);

  await mkdir(ART_PATH, { recursive: true });
  await writeFile(filePath, artData.data);

  const coverUrl = `/art/${fileName}`;

  await db
    .update(albums)
    .set({ coverUrl })
    .where(eq(albums.id, albumId));

  logger.debug({ albumId, coverUrl, size: artData.data.length }, "Album art saved");
}
