import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

import {
  executeGraphQL,
  CREATE_USER_MUTATION,
  LOGIN_MUTATION,
  CREATE_ARTIST_MUTATION,
  UPDATE_ARTIST_MUTATION,
  DELETE_ARTIST_MUTATION,
  CREATE_ALBUM_MUTATION,
  UPDATE_ALBUM_MUTATION,
  DELETE_ALBUM_MUTATION,
  CREATE_TRACK_MUTATION,
  UPDATE_TRACK_MUTATION,
  DELETE_TRACK_MUTATION,
  CREATE_GENRE_MUTATION,
  UPDATE_GENRE_MUTATION,
  DELETE_GENRE_MUTATION,
  ARTISTS_QUERY,
  ARTIST_QUERY,
  ALBUMS_QUERY,
  ALBUM_QUERY,
  TRACKS_QUERY,
  TRACK_QUERY,
  GENRES_QUERY,
  SEARCH_MUSIC_QUERY,
} from "../helpers/graphql.js";

import { setupE2e, type E2eFixture } from "../helpers/setup-e2e.js";

// ── Shared state ──────────────────────────────────────────────────────────
let fixture: E2eFixture;
let agent: ReturnType<typeof request>;

let authToken: string;
let testArtistId: string;
let testAlbumId: string;
let testTrackId: string;
let testGenreId: string;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeAll(async () => {
  fixture = await setupE2e();
  agent = fixture.agent;

  // Create a user + login so we have a valid token for mutations
  await executeGraphQL<{
    createUser: { id: string };
  }>(agent, {
    query: CREATE_USER_MUTATION,
    variables: {
      input: {
        email: "music-tester@test.com",
        password: "secret123",
        firstName: "Music",
        lastName: "Tester",
      },
    },
  });

  const loginRes = await executeGraphQL<{
    login: { token: string };
  }>(agent, {
    query: LOGIN_MUTATION,
    variables: { email: "music-tester@test.com", password: "secret123" },
  });
  authToken = loginRes.data!.login.token;
});

afterAll(async () => {
  await fixture?.cleanup();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Music e2e", () => {
  // -------------------------------------------------------------------------
  // Artist CRUD
  // -------------------------------------------------------------------------

  describe("Artists", () => {
    it("creates an artist with all fields", async () => {
      const res = await executeGraphQL<{
        createArtist: {
          id: string;
          name: string;
          bio: string | null;
          imageUrl: string | null;
          createdAt: string;
          updatedAt: string;
        };
      }>(agent, {
        query: CREATE_ARTIST_MUTATION,
        variables: {
          input: {
            name: "Test Artist",
            bio: "A test biography",
            imageUrl: "https://example.com/artist.jpg",
          },
        },
        token: authToken,
      });

      expect(res.errors).toBeUndefined();
      testArtistId = res.data!.createArtist.id;
      expect(testArtistId).toMatch(UUID_RE);
      expect(res.data!.createArtist.name).toBe("Test Artist");
      expect(res.data!.createArtist.bio).toBe("A test biography");
      expect(res.data!.createArtist.imageUrl).toBe(
        "https://example.com/artist.jpg",
      );
      expect(res.data!.createArtist.createdAt).toBeTruthy();
      expect(res.data!.createArtist.updatedAt).toBeTruthy();
    });

    it("lists all artists", async () => {
      const res = await executeGraphQL<{
        artists: Array<{ id: string; name: string }>;
      }>(agent, {
        query: ARTISTS_QUERY,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.artists.length).toBeGreaterThanOrEqual(1);
      expect(res.data!.artists.some((a) => a.name === "Test Artist")).toBe(
        true,
      );
    });

    it("gets artist by id with nested albums", async () => {
      const res = await executeGraphQL<{
        artist: { id: string; name: string; albums: Array<{ id: string }> };
      }>(agent, {
        query: ARTIST_QUERY,
        variables: { id: testArtistId },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.artist.id).toBe(testArtistId);
      expect(res.data!.artist.name).toBe("Test Artist");
      expect(res.data!.artist.albums).toEqual([]);
    });

    it("returns null for non-existent artist", async () => {
      const res = await executeGraphQL<{
        artist: Record<string, unknown> | null;
      }>(agent, {
        query: ARTIST_QUERY,
        variables: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.artist).toBeNull();
    });

    it("updates an artist's name and bio", async () => {
      const res = await executeGraphQL<{
        updateArtist: { name: string; bio: string | null };
      }>(agent, {
        query: UPDATE_ARTIST_MUTATION,
        variables: {
          id: testArtistId,
          input: { name: "Updated Artist", bio: "Updated bio" },
        },
        token: authToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.updateArtist.name).toBe("Updated Artist");
      expect(res.data!.updateArtist.bio).toBe("Updated bio");
    });

    it("deletes an artist", async () => {
      // Create disposable artist
      const createRes = await executeGraphQL<{
        createArtist: { id: string };
      }>(agent, {
        query: CREATE_ARTIST_MUTATION,
        variables: { input: { name: "Disposable Artist" } },
        token: authToken,
      });
      const disposableId = createRes.data!.createArtist.id;

      const deleteRes = await executeGraphQL<{
        deleteArtist: boolean;
      }>(agent, {
        query: DELETE_ARTIST_MUTATION,
        variables: { id: disposableId },
        token: authToken,
      });

      expect(deleteRes.errors).toBeUndefined();
      expect(deleteRes.data!.deleteArtist).toBe(true);
    });

    it("returns false when deleting non-existent artist", async () => {
      const res = await executeGraphQL<{
        deleteArtist: boolean;
      }>(agent, {
        query: DELETE_ARTIST_MUTATION,
        variables: { id: "00000000-0000-0000-0000-000000000000" },
        token: authToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.deleteArtist).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Album CRUD
  // -------------------------------------------------------------------------

  describe("Albums", () => {
    it("creates an album linked to artist", async () => {
      const res = await executeGraphQL<{
        createAlbum: {
          id: string;
          title: string;
          artist: { id: string };
          releaseYear: number | null;
          coverUrl: string | null;
          createdAt: string;
          updatedAt: string;
        };
      }>(agent, {
        query: CREATE_ALBUM_MUTATION,
        variables: {
          input: {
            title: "Test Album",
            artistId: testArtistId,
            releaseYear: 2024,
            coverUrl: "https://example.com/album.jpg",
          },
        },
        token: authToken,
      });

      expect(res.errors).toBeUndefined();
      testAlbumId = res.data!.createAlbum.id;
      expect(testAlbumId).toMatch(UUID_RE);
      expect(res.data!.createAlbum.title).toBe("Test Album");
      expect(res.data!.createAlbum.artist.id).toBe(testArtistId);
      expect(res.data!.createAlbum.releaseYear).toBe(2024);
      expect(res.data!.createAlbum.coverUrl).toBe(
        "https://example.com/album.jpg",
      );
      expect(res.data!.createAlbum.createdAt).toBeTruthy();
      expect(res.data!.createAlbum.updatedAt).toBeTruthy();
    });

    it("lists all albums", async () => {
      const res = await executeGraphQL<{
        albums: Array<{ id: string; title: string }>;
      }>(agent, {
        query: ALBUMS_QUERY,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.albums.length).toBeGreaterThanOrEqual(1);
      expect(res.data!.albums.some((a) => a.title === "Test Album")).toBe(true);
    });

    it("filters albums by artistId", async () => {
      const res = await executeGraphQL<{
        albums: Array<{ id: string; title: string }>;
      }>(agent, {
        query: ALBUMS_QUERY,
        variables: { artistId: testArtistId },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.albums.length).toBe(1);
      expect(res.data!.albums[0].title).toBe("Test Album");
    });

    it("gets album by id with nested artist and tracks", async () => {
      const res = await executeGraphQL<{
        album: {
          id: string;
          title: string;
          artist: { id: string; name: string };
          tracks: Array<{ id: string }>;
        };
      }>(agent, {
        query: ALBUM_QUERY,
        variables: { id: testAlbumId },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.album.id).toBe(testAlbumId);
      expect(res.data!.album.artist.id).toBe(testArtistId);
      expect(res.data!.album.artist.name).toBe("Updated Artist");
      expect(res.data!.album.tracks).toEqual([]);
    });

    it("returns null for non-existent album", async () => {
      const res = await executeGraphQL<{
        album: Record<string, unknown> | null;
      }>(agent, {
        query: ALBUM_QUERY,
        variables: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.album).toBeNull();
    });

    it("updates album title", async () => {
      const res = await executeGraphQL<{
        updateAlbum: { title: string };
      }>(agent, {
        query: UPDATE_ALBUM_MUTATION,
        variables: {
          id: testAlbumId,
          input: { title: "Updated Album" },
        },
        token: authToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.updateAlbum.title).toBe("Updated Album");
    });
  });

  // -------------------------------------------------------------------------
  // Track CRUD
  // -------------------------------------------------------------------------

  describe("Tracks", () => {
    it("creates a track linked to album", async () => {
      const res = await executeGraphQL<{
        createTrack: {
          id: string;
          title: string;
          album: { id: string };
          trackNumber: number | null;
          discNumber: number | null;
          duration: number | null;
          filePath: string;
          fileFormat: string | null;
          fileSize: number | null;
          createdAt: string;
          updatedAt: string;
        };
      }>(agent, {
        query: CREATE_TRACK_MUTATION,
        variables: {
          input: {
            title: "Test Track",
            albumId: testAlbumId,
            trackNumber: 1,
            discNumber: 1,
            duration: 180,
            filePath: "test-artist/test-album/test-track.mp3",
            fileFormat: "mp3",
            fileSize: 5000000,
          },
        },
        token: authToken,
      });

      expect(res.errors).toBeUndefined();
      testTrackId = res.data!.createTrack.id;
      expect(testTrackId).toMatch(UUID_RE);
      expect(res.data!.createTrack.title).toBe("Test Track");
      expect(res.data!.createTrack.album.id).toBe(testAlbumId);
      expect(res.data!.createTrack.trackNumber).toBe(1);
      expect(res.data!.createTrack.discNumber).toBe(1);
      expect(res.data!.createTrack.duration).toBe(180);
      expect(res.data!.createTrack.filePath).toBe(
        "test-artist/test-album/test-track.mp3",
      );
      expect(res.data!.createTrack.fileFormat).toBe("mp3");
      expect(res.data!.createTrack.fileSize).toBe(5000000);
    });

    it("lists tracks", async () => {
      const res = await executeGraphQL<{
        tracks: Array<{ id: string; title: string }>;
      }>(agent, {
        query: TRACKS_QUERY,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.tracks.length).toBeGreaterThanOrEqual(1);
      expect(res.data!.tracks.some((t) => t.title === "Test Track")).toBe(true);
    });

    it("filters tracks by albumId", async () => {
      const res = await executeGraphQL<{
        tracks: Array<{ id: string; title: string }>;
      }>(agent, {
        query: TRACKS_QUERY,
        variables: { albumId: testAlbumId },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.tracks.length).toBe(1);
      expect(res.data!.tracks[0].title).toBe("Test Track");
    });

    it("gets track by id with nested album, artist, and genres", async () => {
      const res = await executeGraphQL<{
        track: {
          id: string;
          title: string;
          album: {
            title: string;
            artist: { id: string; name: string };
          };
          genres: Array<{ id: string; name: string }>;
        };
      }>(agent, {
        query: TRACK_QUERY,
        variables: { id: testTrackId },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.track.id).toBe(testTrackId);
      expect(res.data!.track.album.title).toBe("Updated Album");
      expect(res.data!.track.album.artist.name).toBe("Updated Artist");
      expect(res.data!.track.genres).toEqual([]);
    });

    it("returns null for non-existent track", async () => {
      const res = await executeGraphQL<{
        track: Record<string, unknown> | null;
      }>(agent, {
        query: TRACK_QUERY,
        variables: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.track).toBeNull();
    });

    it("updates track title and duration", async () => {
      const res = await executeGraphQL<{
        updateTrack: { title: string; duration: number | null };
      }>(agent, {
        query: UPDATE_TRACK_MUTATION,
        variables: {
          id: testTrackId,
          input: { title: "Updated Track", duration: 200 },
        },
        token: authToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.updateTrack.title).toBe("Updated Track");
      expect(res.data!.updateTrack.duration).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Genre CRUD
  // -------------------------------------------------------------------------

  describe("Genres", () => {
    it("creates a genre", async () => {
      const res = await executeGraphQL<{
        createGenre: { id: string; name: string };
      }>(agent, {
        query: CREATE_GENRE_MUTATION,
        variables: { input: { name: "Rock" } },
        token: authToken,
      });

      expect(res.errors).toBeUndefined();
      testGenreId = res.data!.createGenre.id;
      expect(testGenreId).toMatch(UUID_RE);
      expect(res.data!.createGenre.name).toBe("Rock");
    });

    it("rejects duplicate genre name", async () => {
      const res = await executeGraphQL(agent, {
        query: CREATE_GENRE_MUTATION,
        variables: { input: { name: "Rock" } },
        token: authToken,
      });

      expect(res.errors).toBeDefined();
    });

    it("lists genres", async () => {
      const res = await executeGraphQL<{
        genres: Array<{ id: string; name: string }>;
      }>(agent, {
        query: GENRES_QUERY,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.genres.length).toBeGreaterThanOrEqual(1);
      expect(res.data!.genres.some((g) => g.name === "Rock")).toBe(true);
    });

    it("updates genre name", async () => {
      const res = await executeGraphQL<{
        updateGenre: { name: string };
      }>(agent, {
        query: UPDATE_GENRE_MUTATION,
        variables: {
          id: testGenreId,
          input: { name: "Alternative Rock" },
        },
        token: authToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.updateGenre.name).toBe("Alternative Rock");
    });
  });

  // -------------------------------------------------------------------------
  // Full-text search
  // -------------------------------------------------------------------------

  describe("Search", () => {
    it("searchMusic finds artists by name", async () => {
      const res = await executeGraphQL<{
        searchMusic: {
          artists: Array<{ id: string; name: string }>;
          albums: Array<{ id: string }>;
          tracks: Array<{ id: string }>;
        };
      }>(agent, {
        query: SEARCH_MUSIC_QUERY,
        variables: { query: "Updated" },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.searchMusic.artists.length).toBeGreaterThanOrEqual(1);
      expect(
        res.data!.searchMusic.artists.some((a) => a.name === "Updated Artist"),
      ).toBe(true);
    });

    it("searchMusic finds tracks by artist name", async () => {
      const res = await executeGraphQL<{
        searchMusic: {
          artists: Array<{ id: string }>;
          albums: Array<{ id: string }>;
          tracks: Array<{ id: string; title: string }>;
        };
      }>(agent, {
        query: SEARCH_MUSIC_QUERY,
        variables: { query: "Updated Artist" },
      });

      expect(res.errors).toBeUndefined();
      // Tracks by this artist should be found even though track title doesn't match
      expect(res.data!.searchMusic.tracks.length).toBeGreaterThanOrEqual(1);
    });

    it("searchMusic finds albums by title", async () => {
      const res = await executeGraphQL<{
        searchMusic: {
          albums: Array<{ id: string; title: string }>;
        };
      }>(agent, {
        query: SEARCH_MUSIC_QUERY,
        variables: { query: "Updated Album" },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.searchMusic.albums.length).toBeGreaterThanOrEqual(1);
      expect(
        res.data!.searchMusic.albums.some((a) => a.title === "Updated Album"),
      ).toBe(true);
    });

    it("searchMusic returns empty results for gibberish query", async () => {
      const res = await executeGraphQL<{
        searchMusic: {
          artists: Array<unknown>;
          albums: Array<unknown>;
          tracks: Array<unknown>;
        };
      }>(agent, {
        query: SEARCH_MUSIC_QUERY,
        variables: { query: "xyznonexistentxyz" },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.searchMusic.artists).toEqual([]);
      expect(res.data!.searchMusic.albums).toEqual([]);
      expect(res.data!.searchMusic.tracks).toEqual([]);
    });

    it("searchMusic handles empty string gracefully", async () => {
      const res = await executeGraphQL<{
        searchMusic: {
          artists: Array<unknown>;
          albums: Array<unknown>;
          tracks: Array<unknown>;
        };
      }>(agent, {
        query: SEARCH_MUSIC_QUERY,
        variables: { query: "" },
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.searchMusic.artists).toEqual([]);
      expect(res.data!.searchMusic.albums).toEqual([]);
      expect(res.data!.searchMusic.tracks).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Auth guards
  // -------------------------------------------------------------------------

  describe("Auth guards", () => {
    it("rejects createArtist without auth token", async () => {
      const res = await executeGraphQL(agent, {
        query: CREATE_ARTIST_MUTATION,
        variables: { input: { name: "Should Fail" } },
      });

      expect(res.data).toBeFalsy();
      expect(res.errors).toBeDefined();
      expect(res.errors![0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("rejects createAlbum without auth token", async () => {
      const res = await executeGraphQL(agent, {
        query: CREATE_ALBUM_MUTATION,
        variables: {
          input: { title: "Should Fail", artistId: testArtistId },
        },
      });

      expect(res.data).toBeFalsy();
      expect(res.errors).toBeDefined();
    });

    it("rejects deleteTrack without auth token", async () => {
      const res = await executeGraphQL(agent, {
        query: DELETE_TRACK_MUTATION,
        variables: { id: testTrackId },
      });

      expect(res.data).toBeFalsy();
      expect(res.errors).toBeDefined();
    });

    it("allows list queries without auth token", async () => {
      const res = await executeGraphQL<{
        artists: Array<unknown>;
      }>(agent, {
        query: ARTISTS_QUERY,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Full lifecycle: artist → album → track → genre association
  // -------------------------------------------------------------------------

  describe("Lifecycle", () => {
    it("completes full chain: create artist → album → track → genre → search", async () => {
      // Create artist
      const artistRes = await executeGraphQL<{
        createArtist: { id: string; name: string };
      }>(agent, {
        query: CREATE_ARTIST_MUTATION,
        variables: { input: { name: "Lifecycle Artist" } },
        token: authToken,
      });
      const lifecycleArtistId = artistRes.data!.createArtist.id;

      // Create genre
      const genreRes = await executeGraphQL<{
        createGenre: { id: string; name: string };
      }>(agent, {
        query: CREATE_GENRE_MUTATION,
        variables: { input: { name: "Jazz" } },
        token: authToken,
      });
      const lifecycleGenreId = genreRes.data!.createGenre.id;

      // Create album
      const albumRes = await executeGraphQL<{
        createAlbum: { id: string; title: string; artist: { id: string } };
      }>(agent, {
        query: CREATE_ALBUM_MUTATION,
        variables: {
          input: {
            title: "Lifecycle Album",
            artistId: lifecycleArtistId,
          },
        },
        token: authToken,
      });
      const lifecycleAlbumId = albumRes.data!.createAlbum.id;

      // Create track with genre
      const trackRes = await executeGraphQL<{
        createTrack: {
          id: string;
          title: string;
          album: { id: string };
        };
      }>(agent, {
        query: CREATE_TRACK_MUTATION,
        variables: {
          input: {
            title: "Lifecycle Track",
            albumId: lifecycleAlbumId,
            filePath: "lifecycle/artist/track.mp3",
            genreIds: [lifecycleGenreId],
          },
        },
        token: authToken,
      });
      const lifecycleTrackId = trackRes.data!.createTrack.id;

      // Verify nested resolution: track → album → artist
      const trackDetailRes = await executeGraphQL<{
        track: {
          id: string;
          title: string;
          album: { title: string; artist: { name: string } };
          genres: Array<{ name: string }>;
        };
      }>(agent, {
        query: TRACK_QUERY,
        variables: { id: lifecycleTrackId },
      });

      expect(trackDetailRes.errors).toBeUndefined();
      expect(trackDetailRes.data!.track.title).toBe("Lifecycle Track");
      expect(trackDetailRes.data!.track.album.title).toBe("Lifecycle Album");
      expect(trackDetailRes.data!.track.album.artist.name).toBe(
        "Lifecycle Artist",
      );
      expect(trackDetailRes.data!.track.genres[0].name).toBe("Jazz");

      // Verify search finds the track
      const searchRes = await executeGraphQL<{
        searchMusic: { tracks: Array<{ id: string }> };
      }>(agent, {
        query: SEARCH_MUSIC_QUERY,
        variables: { query: "Lifecycle" },
      });

      expect(searchRes.errors).toBeUndefined();
      expect(searchRes.data!.searchMusic.tracks.length).toBeGreaterThanOrEqual(
        1,
      );

      // Clean up: delete track → album → artist → genre
      // (deletion order: track first, then album, then artist — FK constraints)
      await executeGraphQL(agent, {
        query: DELETE_TRACK_MUTATION,
        variables: { id: lifecycleTrackId },
        token: authToken,
      });

      await executeGraphQL(agent, {
        query: DELETE_ALBUM_MUTATION,
        variables: { id: lifecycleAlbumId },
        token: authToken,
      });

      await executeGraphQL(agent, {
        query: DELETE_ARTIST_MUTATION,
        variables: { id: lifecycleArtistId },
        token: authToken,
      });

      const deleteGenreRes = await executeGraphQL<{
        deleteGenre: boolean;
      }>(agent, {
        query: DELETE_GENRE_MUTATION,
        variables: { id: lifecycleGenreId },
        token: authToken,
      });
      expect(deleteGenreRes.data!.deleteGenre).toBe(true);
    });
  });
});
