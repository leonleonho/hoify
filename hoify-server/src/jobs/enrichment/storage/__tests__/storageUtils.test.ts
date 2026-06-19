/**
 * Storage integration tests: require Docker Postgres container.
 */
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rm, access } from "node:fs/promises";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { startContainer } from "../../../../__tests__/helpers/docker.js";
import { reconnect } from "../../../../db/index.js";
import { eq, and } from "drizzle-orm";
import type { ParsedTrack } from "../../types/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, "../../../../db/migrations");

let container: Awaited<ReturnType<typeof startContainer>>;

beforeAll(async () => {
  container = await startContainer();
  const dbUrl = `postgresql://hoify:hoify_dev@localhost:${container.port}/hoify`;
  await reconnect(dbUrl);
  const { db } = await import("../../../../db/index.js");
  await migrate(db, { migrationsFolder });
}, 120_000);

afterAll(async () => {
  await container?.cleanup();
}, 30_000);

function makeTrack(guid: string, overrides: Partial<ParsedTrack> = {}): ParsedTrack {
  return {
    filePath: `/music/test/${guid}.mp3`,
    fileFormat: "mp3",
    fileSize: 5000,
    fileMtime: 1000,
    title: `Song ${guid}`,
    artist: `Artist ${guid}`,
    album: `Album ${guid}`,
    year: 2022,
    trackNumber: 1,
    discNumber: 1,
    duration: 200,
    genreNames: ["rock", "alternative"],
    aliases: [],
    albumAliases: [],
    artistAliases: [],
    ...overrides,
  };
}

async function loadDeps() {
  const db = (await import("../../../../db/index.js")).db;
  const schema = await import("../../../../db/schema.js");
  const storage = await import("../storageUtils.js");
  return { db, schema, storage };
}

describe("upsertOne", () => {
  it("inserts genres, artist, album, track, and genre links", async () => {
    const { db, schema, storage } = await loadDeps();
    const track = makeTrack("insert-test");
    await storage.upsertOne(track);

    const [artist] = await db
      .select()
      .from(schema.artists)
      .where(eq(schema.artists.name, "Artist insert-test"))
      .limit(1);
    expect(artist).toBeDefined();

    const [album] = await db
      .select()
      .from(schema.albums)
      .where(and(eq(schema.albums.title, "Album insert-test"), eq(schema.albums.artistId, artist.id)))
      .limit(1);
    expect(album).toBeDefined();
    expect(album.releaseYear).toBe(2022);

    const [trackRow] = await db
      .select()
      .from(schema.tracks)
      .where(eq(schema.tracks.filePath, track.filePath))
      .limit(1);
    expect(trackRow).toBeDefined();
    expect(trackRow.title).toBe("Song insert-test");

    const genreRows = await db
      .select()
      .from(schema.genres)
      .where(eq(schema.genres.name, "rock"));
    expect(genreRows.length).toBeGreaterThan(0);

    const links = await db
      .select()
      .from(schema.trackGenres)
      .where(eq(schema.trackGenres.trackId, trackRow!.id));
    expect(links.length).toBe(2);
  });

  it("reuses existing artist on duplicate name", async () => {
    const { db, schema, storage } = await loadDeps();

    await storage.upsertOne(makeTrack("dup-artist-1", { artist: "Shared Artist" }));
    await storage.upsertOne(makeTrack("dup-artist-2", { artist: "Shared Artist", album: "Other Album", title: "Other Song" }));

    const rows = await db
      .select()
      .from(schema.artists)
      .where(eq(schema.artists.name, "Shared Artist"));
    expect(rows.length).toBe(1);
  });

  it("reuses existing album on duplicate title+artist", async () => {
    const { db, schema, storage } = await loadDeps();

    await storage.upsertOne(makeTrack("dup-album-1", { artist: "Dup Artist A", album: "Shared Album" }));
    await storage.upsertOne(makeTrack("dup-album-2", { artist: "Dup Artist A", album: "Shared Album", title: "Other Song" }));

    const rows = await db
      .select()
      .from(schema.albums)
      .where(and(eq(schema.albums.title, "Shared Album")));
    expect(rows.length).toBe(1);
  });

  it("updates track when file metadata changes", async () => {
    const { db, schema, storage } = await loadDeps();

    const track = makeTrack("update-track");
    await storage.upsertOne({ ...track, fileSize: 5000, fileMtime: 1000 });
    await storage.upsertOne({ ...track, fileSize: 6000, fileMtime: 2000 });

    const [trackRow] = await db
      .select()
      .from(schema.tracks)
      .where(eq(schema.tracks.filePath, track.filePath))
      .limit(1);
    expect(trackRow!.fileSize).toBe(6000);
    expect(trackRow!.fileMtime).toBe(2000);
  });

  it("handles empty genre list", async () => {
    const { db, schema, storage } = await loadDeps();

    const track = makeTrack("no-genres", { genreNames: [] });
    const { albumId } = await storage.upsertOne(track);

    const [trackRow] = await db
      .select()
      .from(schema.tracks)
      .where(eq(schema.tracks.filePath, track.filePath))
      .limit(1);
    expect(trackRow).toBeDefined();
    expect(trackRow!.albumId).toBe(albumId);
  });
});

describe("saveAlbumArt", () => {
  const ART_PATH = resolve(process.env.ALBUM_ART_PATH ?? resolve(process.cwd(), "album-art"));

  afterAll(async () => {
    try { await rm(ART_PATH, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("saves album art to disk and updates coverUrl", async () => {
    const { db, schema, storage } = await loadDeps();

    const track = makeTrack("art-save");
    const { albumId } = await storage.upsertOne(track);
    await storage.saveAlbumArt(albumId, { data: Buffer.from("fake-image-bytes"), format: "image/jpeg" });

    const [album] = await db
      .select()
      .from(schema.albums)
      .where(eq(schema.albums.id, albumId))
      .limit(1);
    expect(album!.coverUrl).toMatch(/^\/art\//);

    await expect(access(resolve(ART_PATH, `${albumId}.jpg`))).resolves.toBeUndefined();
  });

  it("skips saving when album already has coverUrl", async () => {
    const { db, schema, storage } = await loadDeps();

    const track = makeTrack("art-skip");
    const { albumId } = await storage.upsertOne(track);

    await storage.saveAlbumArt(albumId, { data: Buffer.from("img1"), format: "image/jpeg" });
    await db.update(schema.albums).set({ coverUrl: "/art/existing.jpg" }).where(eq(schema.albums.id, albumId));
    await storage.saveAlbumArt(albumId, { data: Buffer.from("img2"), format: "image/jpeg" });

    const [album] = await db
      .select()
      .from(schema.albums)
      .where(eq(schema.albums.id, albumId))
      .limit(1);
    expect(album!.coverUrl).toBe("/art/existing.jpg");
  });

  it("maps MIME types to extensions correctly", async () => {
    const { storage } = await loadDeps();

    const track = makeTrack("art-png", { album: "Art PNG Album" });
    const { albumId } = await storage.upsertOne(track);
    await storage.saveAlbumArt(albumId, { data: Buffer.from("png-data"), format: "image/png" });

    await expect(access(resolve(ART_PATH, `${albumId}.png`))).resolves.toBeUndefined();
  });
});
