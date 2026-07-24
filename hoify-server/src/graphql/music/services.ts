import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { db } from "../../db/index.js";
import {
  artists,
  albums,
  tracks,
  genres,
  trackGenres,
  playlists,
} from "../../db/schema.js";
import { albumArtPath } from "../../paths.js";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
};

const MAX_ALBUM_ART_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function fmtDate(
  value: Date | string | null | undefined,
): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function decodeArtBase64(imageBase64: string, label: string): Buffer {
  const raw = imageBase64.includes(",")
    ? imageBase64.slice(imageBase64.indexOf(",") + 1)
    : imageBase64;

  if (!raw || !/^[A-Za-z0-9+/=\s]+$/.test(raw)) {
    throw new GraphQLError("Invalid base64 image data", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  const data = Buffer.from(raw, "base64");

  if (data.length === 0) {
    throw new GraphQLError("Invalid base64 image data", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  if (data.length > MAX_ALBUM_ART_BYTES) {
    throw new GraphQLError(`${label} exceeds maximum size of 10 MiB`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  return data;
}

async function removeOldArtFile(
  entityId: string,
  artUrl: string | null,
  nextFileName: string,
): Promise<void> {
  if (!artUrl?.startsWith("/art/")) return;

  const oldFileName = artUrl.slice("/art/".length);
  if (!oldFileName || oldFileName === nextFileName) return;
  if (!oldFileName.startsWith(`${entityId}.`)) return;

  const oldPath = resolve(albumArtPath, oldFileName);
  if (!oldPath.startsWith(albumArtPath)) return;

  try {
    await unlink(oldPath);
  } catch {
    // Missing old file is fine when overwriting
  }
}

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------

export async function listArtists() {
  return db.select().from(artists).limit(50);
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

export async function updateArtistArt(
  artistId: string,
  input: { imageBase64: string; mimeType: string },
) {
  const artist = await getArtist(artistId);
  if (!artist) return null;

  const ext = MIME_TO_EXT[input.mimeType];
  if (!ext) {
    throw new GraphQLError(
      `Unsupported mime type: ${input.mimeType}. Allowed: ${Object.keys(MIME_TO_EXT).join(", ")}`,
      { extensions: { code: "BAD_USER_INPUT" } },
    );
  }

  const data = decodeArtBase64(input.imageBase64, "Artist art");
  const fileName = `${artistId}.${ext}`;
  const filePath = resolve(albumArtPath, fileName);

  if (!filePath.startsWith(albumArtPath)) {
    throw new GraphQLError("Invalid artist art path", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  await removeOldArtFile(artistId, artist.imageUrl, fileName);
  await mkdir(albumArtPath, { recursive: true });
  await writeFile(filePath, data);

  const imageUrl = `/art/${fileName}`;
  const [row] = await db
    .update(artists)
    .set({ imageUrl })
    .where(eq(artists.id, artistId))
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
  return db.select().from(albums).where(filter).limit(50);
}

export async function getAlbum(id: string) {
  const [row] = await db.select().from(albums).where(eq(albums.id, id));
  return row ?? null;
}

export async function createAlbum(input: {
  title: string;
  artistId: string;
  releaseYear?: number | null;
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
  },
) {
  const [row] = await db
    .update(albums)
    .set(input)
    .where(eq(albums.id, id))
    .returning();
  return row ?? null;
}

export async function updateAlbumArt(
  albumId: string,
  input: { imageBase64: string; mimeType: string },
) {
  const album = await getAlbum(albumId);
  if (!album) return null;

  const ext = MIME_TO_EXT[input.mimeType];
  if (!ext) {
    throw new GraphQLError(
      `Unsupported mime type: ${input.mimeType}. Allowed: ${Object.keys(MIME_TO_EXT).join(", ")}`,
      { extensions: { code: "BAD_USER_INPUT" } },
    );
  }

  const data = decodeArtBase64(input.imageBase64, "Album art");
  const fileName = `${albumId}.${ext}`;
  const filePath = resolve(albumArtPath, fileName);

  if (!filePath.startsWith(albumArtPath)) {
    throw new GraphQLError("Invalid album art path", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  await removeOldArtFile(albumId, album.coverUrl, fileName);
  await mkdir(albumArtPath, { recursive: true });
  await writeFile(filePath, data);

  const coverUrl = `/art/${fileName}`;
  const [row] = await db
    .update(albums)
    .set({ coverUrl })
    .where(eq(albums.id, albumId))
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
  return db
    .select()
    .from(tracks)
    .where(filter)
    .orderBy(asc(tracks.discNumber), asc(tracks.trackNumber))
    .limit(50);
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
    trackArtist?: string | null;
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
  return db.select().from(genres).limit(50);
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
    .where(eq(trackGenres.genreId, genreId))
    .limit(50);
  return rows.map((r) => r.track);
}

// ---------------------------------------------------------------------------
// Full-text search
// ---------------------------------------------------------------------------

export async function searchMusic(query: string) {
  const sanitized = query.trim();
  if (!sanitized) {
    return { artists: [], albums: [], tracks: [], playlists: [] };
  }

  const [matchingArtists, matchingAlbums, matchingTracks, matchingPlaylists] =
    await Promise.all([
      db
        .select()
        .from(artists)
        .where(
          sql`to_tsvector('english', ${artists.name}) @@ websearch_to_tsquery('english', ${sanitized})
            OR ${artists.name} ILIKE '%' || ${sanitized} || '%'
            OR EXISTS (SELECT 1 FROM unnest(${artists.aliases}) a WHERE a ILIKE '%' || ${sanitized} || '%')`,
        )
        .limit(50),

      db
        .select()
        .from(albums)
        .where(
          sql`to_tsvector('english', ${albums.title}) @@ websearch_to_tsquery('english', ${sanitized})
            OR ${albums.title} ILIKE '%' || ${sanitized} || '%'
            OR EXISTS (SELECT 1 FROM unnest(${albums.aliases}) a WHERE a ILIKE '%' || ${sanitized} || '%')`,
        )
        .limit(50),

      db
        .select({
          id: tracks.id,
          title: tracks.title,
          trackArtist: tracks.trackArtist,
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
          sql`to_tsvector('english', ${tracks.title}) @@ websearch_to_tsquery('english', ${sanitized})
            OR to_tsvector('english', ${albums.title}) @@ websearch_to_tsquery('english', ${sanitized})
            OR to_tsvector('english', ${artists.name}) @@ websearch_to_tsquery('english', ${sanitized})
            OR ${tracks.title} ILIKE '%' || ${sanitized} || '%'
            OR ${albums.title} ILIKE '%' || ${sanitized} || '%'
            OR ${artists.name} ILIKE '%' || ${sanitized} || '%'
            OR EXISTS (SELECT 1 FROM unnest(${tracks.aliases}) a WHERE a ILIKE '%' || ${sanitized} || '%')`,
        )
        .limit(50),

      db
        .select()
        .from(playlists)
        .where(
          sql`${playlists.isPublic} = true AND to_tsvector('english', ${playlists.name}) @@ websearch_to_tsquery('english', ${sanitized})
            OR ${playlists.isPublic} = true AND ${playlists.name} ILIKE '%' || ${sanitized} || '%'`,
        )
        .limit(50),
    ]);

  return {
    artists: matchingArtists,
    albums: matchingAlbums,
    tracks: matchingTracks,
    playlists: matchingPlaylists,
  };
}
