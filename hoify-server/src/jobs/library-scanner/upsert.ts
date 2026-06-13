import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  artists,
  albums,
  tracks,
  genres,
  trackGenres,
} from "../../db/schema.js";
import type { ParsedTrack } from "./types.js";

// ---------------------------------------------------------------------------
// Upsert parsed tracks into the database
// ---------------------------------------------------------------------------

export async function upsertAll(
  parsed: ParsedTrack[],
): Promise<{ artists: number; albums: number; tracks: number; genres: number }> {
  const counts = { artists: 0, albums: 0, tracks: 0, genres: 0 };

  // 1. Bulk upsert genres — collect unique names, insert ignore conflicts
  const allGenreNames = [
    ...new Set(parsed.flatMap((t) => t.genreNames)),
  ].filter(Boolean);

  if (allGenreNames.length > 0) {
    const inserted = await db
      .insert(genres)
      .values(allGenreNames.map((name) => ({ name })))
      .onConflictDoNothing()
      .returning({ id: genres.id });
    counts.genres = inserted.length;
  }

  // 2. Fetch genre name → id lookup
  const allGenres = await db.select().from(genres);
  const genreByName = new Map(allGenres.map((g) => [g.name, g.id]));

  // 3. Process each track
  for (const track of parsed) {
    // --- Artist: find or create by name ---
    let artistId: string;
    const [existingArtist] = await db
      .select({ id: artists.id })
      .from(artists)
      .where(eq(artists.name, track.artist))
      .limit(1);

    if (existingArtist) {
      artistId = existingArtist.id;
    } else {
      const [inserted] = await db
        .insert(artists)
        .values({ name: track.artist })
        .returning({ id: artists.id });
      artistId = inserted.id;
      counts.artists++;
    }

    // --- Album: find or create by (title, artistId) ---
    let albumId: string;
    const [existingAlbum] = await db
      .select({ id: albums.id })
      .from(albums)
      .where(
        and(eq(albums.title, track.album), eq(albums.artistId, artistId)),
      )
      .limit(1);

    if (existingAlbum) {
      albumId = existingAlbum.id;
    } else {
      const [inserted] = await db
        .insert(albums)
        .values({
          title: track.album,
          artistId,
          releaseYear: track.year,
        })
        .returning({ id: albums.id });
      albumId = inserted.id;
      counts.albums++;
    }

    // --- Track: find by filePath → update or insert ---
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
        })
        .returning({ id: tracks.id });
      trackId = inserted.id;
      counts.tracks++;
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
  }

  return counts;
}
