import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  artists,
  albums,
  tracks,
  genres,
  trackGenres,
} from "../../db/schema.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function fmtDate(
  value: Date | string | null | undefined,
): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------

export async function listArtists() {
  return db.select().from(artists);
}

export async function getArtist(id: string) {
  const [row] = await db.select().from(artists).where(eq(artists.id, id));
  return row ?? null;
}

export async function createArtist(input: {
  name: string;
  bio?: string | null;
  imageUrl?: string | null;
}) {
  const [row] = await db.insert(artists).values(input).returning();
  return row;
}

export async function updateArtist(
  id: string,
  input: { name?: string; bio?: string | null; imageUrl?: string | null },
) {
  const [row] = await db
    .update(artists)
    .set(input)
    .where(eq(artists.id, id))
    .returning();
  return row ?? null;
}

export async function deleteArtist(id: string) {
  // cascade: albums → tracks must be deleted first (or rely on FK cascade)
  const [deleted] = await db
    .delete(artists)
    .where(eq(artists.id, id))
    .returning({ id: artists.id });
  return !!deleted;
}

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export async function listAlbums(artistId: string | null) {
  const filter = artistId ? eq(albums.artistId, artistId) : undefined;
  return db.select().from(albums).where(filter);
}

export async function getAlbum(id: string) {
  const [row] = await db.select().from(albums).where(eq(albums.id, id));
  return row ?? null;
}

export async function createAlbum(input: {
  title: string;
  artistId: string;
  releaseYear?: number | null;
  coverUrl?: string | null;
}) {
  const [row] = await db.insert(albums).values(input).returning();
  return row;
}

export async function updateAlbum(
  id: string,
  input: {
    title?: string;
    artistId?: string;
    releaseYear?: number | null;
    coverUrl?: string | null;
  },
) {
  const [row] = await db
    .update(albums)
    .set(input)
    .where(eq(albums.id, id))
    .returning();
  return row ?? null;
}

export async function deleteAlbum(id: string) {
  // track_genres for all tracks in this album must be deleted first (or FK cascade)
  const [deleted] = await db
    .delete(albums)
    .where(eq(albums.id, id))
    .returning({ id: albums.id });
  return !!deleted;
}

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

export async function listTracks(albumId: string | null) {
  const filter = albumId ? eq(tracks.albumId, albumId) : undefined;
  return db.select().from(tracks).where(filter);
}

export async function getTrack(id: string) {
  const [row] = await db.select().from(tracks).where(eq(tracks.id, id));
  return row ?? null;
}

export async function createTrack(input: {
  title: string;
  albumId: string;
  trackNumber?: number | null;
  discNumber?: number | null;
  duration?: number | null;
  filePath: string;
  fileFormat?: string | null;
  fileSize?: number | null;
  genreIds?: string[];
}) {
  const { genreIds, ...trackData } = input;

  const [row] = await db.insert(tracks).values(trackData).returning();

  if (genreIds?.length) {
    await db.insert(trackGenres).values(
      genreIds.map((genreId) => ({ trackId: row.id, genreId })),
    );
  }

  return row;
}

export async function updateTrack(
  id: string,
  input: {
    title?: string;
    albumId?: string;
    trackNumber?: number | null;
    discNumber?: number | null;
    duration?: number | null;
    filePath?: string;
    fileFormat?: string | null;
    fileSize?: number | null;
    genreIds?: string[];
  },
) {
  const { genreIds, ...trackData } = input;

  const [row] = await db
    .update(tracks)
    .set(trackData)
    .where(eq(tracks.id, id))
    .returning();

  if (genreIds !== undefined) {
    await db.delete(trackGenres).where(eq(trackGenres.trackId, id));
    if (genreIds.length > 0) {
      await db.insert(trackGenres).values(
        genreIds.map((genreId) => ({ trackId: id, genreId })),
      );
    }
  }

  return row ?? null;
}

export async function deleteTrack(id: string) {
  await db.delete(trackGenres).where(eq(trackGenres.trackId, id));
  const [deleted] = await db
    .delete(tracks)
    .where(eq(tracks.id, id))
    .returning({ id: tracks.id });
  return !!deleted;
}

// ---------------------------------------------------------------------------
// Genres
// ---------------------------------------------------------------------------

export async function listGenres() {
  return db.select().from(genres);
}

export async function getGenre(id: string) {
  const [row] = await db.select().from(genres).where(eq(genres.id, id));
  return row ?? null;
}

export async function createGenre(input: { name: string }) {
  const [row] = await db.insert(genres).values(input).returning();
  return row;
}

export async function updateGenre(id: string, input: { name?: string }) {
  const [row] = await db
    .update(genres)
    .set(input)
    .where(eq(genres.id, id))
    .returning();
  return row ?? null;
}

export async function deleteGenre(id: string) {
  await db.delete(trackGenres).where(eq(trackGenres.genreId, id));
  const [deleted] = await db
    .delete(genres)
    .where(eq(genres.id, id))
    .returning({ id: genres.id });
  return !!deleted;
}

// ---------------------------------------------------------------------------
// Track-Genre resolution (for field resolvers)
// ---------------------------------------------------------------------------

export async function getTrackGenres(trackId: string) {
  const rows = await db
    .select({ genre: genres })
    .from(trackGenres)
    .innerJoin(genres, eq(trackGenres.genreId, genres.id))
    .where(eq(trackGenres.trackId, trackId));
  return rows.map((r) => r.genre);
}

export async function getGenreTracks(genreId: string) {
  const rows = await db
    .select({ track: tracks })
    .from(trackGenres)
    .innerJoin(tracks, eq(trackGenres.trackId, tracks.id))
    .where(eq(trackGenres.genreId, genreId));
  return rows.map((r) => r.track);
}

// ---------------------------------------------------------------------------
// Full-text search
// ---------------------------------------------------------------------------

export async function searchMusic(query: string) {
  const sanitized = query.trim();
  if (!sanitized) {
    return { artists: [], albums: [], tracks: [] };
  }

  const [matchingArtists, matchingAlbums, matchingTracks] =
    await Promise.all([
      db
        .select()
        .from(artists)
        .where(
          sql`to_tsvector('english', ${artists.name}) @@ plainto_tsquery('english', ${sanitized})`,
        ),

      db
        .select()
        .from(albums)
        .where(
          sql`to_tsvector('english', ${albums.title}) @@ plainto_tsquery('english', ${sanitized})`,
        ),

      db
        .select({
          id: tracks.id,
          title: tracks.title,
          albumId: tracks.albumId,
          trackNumber: tracks.trackNumber,
          discNumber: tracks.discNumber,
          duration: tracks.duration,
          filePath: tracks.filePath,
          fileFormat: tracks.fileFormat,
          fileSize: tracks.fileSize,
          createdAt: tracks.createdAt,
          updatedAt: tracks.updatedAt,
        })
        .from(tracks)
        .innerJoin(albums, eq(tracks.albumId, albums.id))
        .innerJoin(artists, eq(albums.artistId, artists.id))
        .where(
          sql`to_tsvector('english', ${tracks.title}) @@ plainto_tsquery('english', ${sanitized})
            OR to_tsvector('english', ${albums.title}) @@ plainto_tsquery('english', ${sanitized})
            OR to_tsvector('english', ${artists.name}) @@ plainto_tsquery('english', ${sanitized})`,
        ),
    ]);

  return {
    artists: matchingArtists,
    albums: matchingAlbums,
    tracks: matchingTracks,
  };
}
