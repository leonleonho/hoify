import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

import {
  executeGraphQL,
  CREATE_USER_MUTATION,
  LOGIN_MUTATION,
  CREATE_ARTIST_MUTATION,
  CREATE_ALBUM_MUTATION,
  CREATE_TRACK_MUTATION,
  CREATE_PLAYLIST_MUTATION,
  UPDATE_PLAYLIST_MUTATION,
  DELETE_PLAYLIST_MUTATION,
  ADD_TRACKS_MUTATION,
  REMOVE_TRACKS_MUTATION,
  REORDER_TRACKS_MUTATION,
  MY_PLAYLISTS_QUERY,
  PLAYLIST_QUERY,
} from "../helpers/graphql.js";

import { setupE2e, type E2eFixture } from "../helpers/setup-e2e.js";

// ── Shared state ──────────────────────────────────────────────────────────
let fixture: E2eFixture;
let agent: ReturnType<typeof request>;

let userAToken: string;
let userBToken: string;

let testTrackIds: string[];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeAll(async () => {
  fixture = await setupE2e();
  agent = fixture.agent;

  // Create user A (playlist creator)
  await executeGraphQL<{ createUser: { id: string } }>(agent, {
    query: CREATE_USER_MUTATION,
    variables: {
      input: {
        email: "playlist-a@test.com",
        password: "secret123",
        firstName: "Playlist",
        lastName: "UserA",
      },
    },
  });

  const loginARes = await executeGraphQL<{ login: { token: string } }>(
    agent,
    {
      query: LOGIN_MUTATION,
      variables: { email: "playlist-a@test.com", password: "secret123" },
    },
  );
  userAToken = loginARes.data!.login.token;

  // Create user B (different user)
  await executeGraphQL<{ createUser: { id: string } }>(agent, {
    query: CREATE_USER_MUTATION,
    variables: {
      input: {
        email: "playlist-b@test.com",
        password: "secret123",
        firstName: "Playlist",
        lastName: "UserB",
      },
    },
  });

  const loginBRes = await executeGraphQL<{ login: { token: string } }>(
    agent,
    {
      query: LOGIN_MUTATION,
      variables: { email: "playlist-b@test.com", password: "secret123" },
    },
  );
  userBToken = loginBRes.data!.login.token;

  // Create tracks to use in playlists
  const artistRes = await executeGraphQL<{
    createArtist: { id: string };
  }>(agent, {
    query: CREATE_ARTIST_MUTATION,
    variables: { input: { name: "Playlist Test Artist" } },
    token: userAToken,
  });
  const artistId = artistRes.data!.createArtist.id;

  const albumRes = await executeGraphQL<{ createAlbum: { id: string } }>(
    agent,
    {
      query: CREATE_ALBUM_MUTATION,
      variables: {
        input: {
          title: "Playlist Test Album",
          artistId,
        },
      },
      token: userAToken,
    },
  );
  const albumId = albumRes.data!.createAlbum.id;

  const trackNames = ["Alpha Track", "Beta Track", "Gamma Track"];
  testTrackIds = [];
  for (const title of trackNames) {
    const res = await executeGraphQL<{
      createTrack: { id: string; title: string };
    }>(agent, {
      query: CREATE_TRACK_MUTATION,
      variables: {
        input: {
          title,
          albumId,
          trackNumber: testTrackIds.length + 1,
          filePath: `playlist-test/${title.toLowerCase().replace(/\s+/g, "-")}.mp3`,
        },
      },
      token: userAToken,
    });
    testTrackIds.push(res.data!.createTrack.id);
  }
});

afterAll(async () => {
  await fixture?.cleanup();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Playlist e2e", () => {
  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------

  describe("Create", () => {
    it("creates a playlist with all fields", async () => {
      const res = await executeGraphQL<{
        createPlaylist: {
          id: string;
          name: string;
          description: string | null;
          isPublic: boolean;
          trackCount: number;
          createdAt: string;
          updatedAt: string;
        };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: {
          input: {
            name: "My Favorites",
            description: "My favorite tracks",
            isPublic: true,
          },
        },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.createPlaylist.id).toMatch(UUID_RE);
      expect(res.data!.createPlaylist.name).toBe("My Favorites");
      expect(res.data!.createPlaylist.description).toBe("My favorite tracks");
      expect(res.data!.createPlaylist.isPublic).toBe(true);
      expect(res.data!.createPlaylist.trackCount).toBe(0);
      expect(res.data!.createPlaylist.createdAt).toBeTruthy();
      expect(res.data!.createPlaylist.updatedAt).toBeTruthy();
    });

    it("creates a playlist with trackIds at initial positions", async () => {
      const [alphaId, betaId] = testTrackIds;

      const res = await executeGraphQL<{
        createPlaylist: {
          id: string;
          name: string;
          trackCount: number;
        };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: {
          input: {
            name: "Initial Order",
            trackIds: [betaId, alphaId],
          },
        },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.createPlaylist.trackCount).toBe(2);

      // Verify positions via playlist query
      const playlistRes = await executeGraphQL<{
        playlist: {
          tracks: Array<{ id: string; title: string }>;
        };
      }>(agent, {
        query: PLAYLIST_QUERY,
        variables: { id: res.data!.createPlaylist.id },
        token: userAToken,
      });

      expect(playlistRes.data!.playlist.tracks[0].id).toBe(betaId);
      expect(playlistRes.data!.playlist.tracks[1].id).toBe(alphaId);
    });

    it("creates a playlist with defaults", async () => {
      const res = await executeGraphQL<{
        createPlaylist: {
          id: string;
          name: string;
          description: string | null;
          isPublic: boolean;
        };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: {
          input: { name: "Minimal" },
        },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.createPlaylist.description).toBeNull();
      expect(res.data!.createPlaylist.isPublic).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // myPlaylists
  // -----------------------------------------------------------------------

  describe("myPlaylists", () => {
    it("returns all playlists owned by the user", async () => {
      const res = await executeGraphQL<{
        myPlaylists: Array<{ name: string }>;
      }>(agent, {
        query: MY_PLAYLISTS_QUERY,
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.myPlaylists.length).toBeGreaterThanOrEqual(3);
      expect(res.data!.myPlaylists.some((p) => p.name === "My Favorites")).toBe(
        true,
      );
    });

    it("returns playlists scoped to user B", async () => {
      const res = await executeGraphQL<{
        myPlaylists: Array<{ name: string }>;
      }>(agent, {
        query: MY_PLAYLISTS_QUERY,
        token: userBToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.myPlaylists).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // playlist (single)
  // -----------------------------------------------------------------------

  describe("playlist (single)", () => {
    let privatePlaylistId: string;
    let publicPlaylistId: string;

    beforeAll(async () => {
      // Create private playlist
      const privateRes = await executeGraphQL<{
        createPlaylist: { id: string };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: { input: { name: "Access Test Private" } },
        token: userAToken,
      });
      privatePlaylistId = privateRes.data!.createPlaylist.id;

      // Create public playlist
      const publicRes = await executeGraphQL<{
        createPlaylist: { id: string };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: { input: { name: "Access Test Public", isPublic: true } },
        token: userAToken,
      });
      publicPlaylistId = publicRes.data!.createPlaylist.id;
    });

    it("owner can view their private playlist", async () => {
      const res = await executeGraphQL<{
        playlist: { id: string; name: string };
      }>(agent, {
        query: PLAYLIST_QUERY,
        variables: { id: privatePlaylistId },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.playlist).not.toBeNull();
      expect(res.data!.playlist.name).toBe("Access Test Private");
    });

    it("other user gets null for private playlist", async () => {
      const res = await executeGraphQL<{
        playlist: Record<string, unknown> | null;
      }>(agent, {
        query: PLAYLIST_QUERY,
        variables: { id: privatePlaylistId },
        token: userBToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.playlist).toBeNull();
    });

    it("other user can view public playlist", async () => {
      const res = await executeGraphQL<{
        playlist: { name: string };
      }>(agent, {
        query: PLAYLIST_QUERY,
        variables: { id: publicPlaylistId },
        token: userBToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.playlist).not.toBeNull();
      expect(res.data!.playlist.name).toBe("Access Test Public");
    });

    it("returns null for non-existent id", async () => {
      const res = await executeGraphQL<{
        playlist: Record<string, unknown> | null;
      }>(agent, {
        query: PLAYLIST_QUERY,
        variables: { id: "00000000-0000-0000-0000-000000000000" },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.playlist).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  describe("Update", () => {
    let playlistId: string;

    beforeAll(async () => {
      const res = await executeGraphQL<{
        createPlaylist: { id: string };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: {
          input: {
            name: "Update Me",
            description: "Original description",
            isPublic: false,
          },
        },
        token: userAToken,
      });
      playlistId = res.data!.createPlaylist.id;
    });

    it("renames a playlist", async () => {
      const res = await executeGraphQL<{
        updatePlaylist: { name: string; description: string | null };
      }>(agent, {
        query: UPDATE_PLAYLIST_MUTATION,
        variables: {
          id: playlistId,
          input: { name: "Updated Name" },
        },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.updatePlaylist.name).toBe("Updated Name");
      // Description should remain unchanged
      expect(res.data!.updatePlaylist.description).toBe("Original description");
    });

    it("toggles isPublic", async () => {
      const res = await executeGraphQL<{
        updatePlaylist: { isPublic: boolean };
      }>(agent, {
        query: UPDATE_PLAYLIST_MUTATION,
        variables: {
          id: playlistId,
          input: { isPublic: true },
        },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.updatePlaylist.isPublic).toBe(true);
    });

    it("clears description", async () => {
      const res = await executeGraphQL<{
        updatePlaylist: { description: string | null };
      }>(agent, {
        query: UPDATE_PLAYLIST_MUTATION,
        variables: {
          id: playlistId,
          input: { description: null },
        },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.updatePlaylist.description).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Add / Remove Tracks
  // -----------------------------------------------------------------------

  describe("Add / Remove Tracks", () => {
    let playlistId: string;

    beforeAll(async () => {
      const res = await executeGraphQL<{
        createPlaylist: { id: string };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: { input: { name: "Track Test Playlist" } },
        token: userAToken,
      });
      playlistId = res.data!.createPlaylist.id;
    });

    it("adds tracks at position 0", async () => {
      const [id0, id1] = testTrackIds;

      const res = await executeGraphQL<{
        addTracksToPlaylist: {
          tracks: Array<{ id: string; title: string }>;
          trackCount: number;
        };
      }>(agent, {
        query: ADD_TRACKS_MUTATION,
        variables: {
          input: {
            playlistId,
            position: 0,
            trackIds: [id0, id1],
          },
        },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.addTracksToPlaylist.trackCount).toBe(2);
      expect(res.data!.addTracksToPlaylist.tracks[0].id).toBe(id0);
      expect(res.data!.addTracksToPlaylist.tracks[1].id).toBe(id1);
    });

    it("inserts tracks at position 1, shifting existing", async () => {
      const [id0, id1, id2] = testTrackIds;

      const res = await executeGraphQL<{
        addTracksToPlaylist: {
          tracks: Array<{ id: string }>;
          trackCount: number;
        };
      }>(agent, {
        query: ADD_TRACKS_MUTATION,
        variables: {
          input: {
            playlistId,
            position: 1,
            trackIds: [id2],
          },
        },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.addTracksToPlaylist.trackCount).toBe(3);
      // id2 should be inserted at position 1, shifting id1 to position 2
      expect(res.data!.addTracksToPlaylist.tracks[0].id).toBe(id0);
      expect(res.data!.addTracksToPlaylist.tracks[1].id).toBe(id2);
      expect(res.data!.addTracksToPlaylist.tracks[2].id).toBe(id1);
    });

    it("removes tracks", async () => {
      const [, id1] = testTrackIds;

      const res = await executeGraphQL<{
        removeTracksFromPlaylist: { trackCount: number };
      }>(agent, {
        query: REMOVE_TRACKS_MUTATION,
        variables: {
          input: {
            playlistId,
            trackIds: [id1],
          },
        },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.removeTracksFromPlaylist.trackCount).toBe(2);
    });

    it("removed tracks no longer in playlist", async () => {
      const [, id1] = testTrackIds;

      const res = await executeGraphQL<{
        playlist: {
          tracks: Array<{ id: string }>;
        };
      }>(agent, {
        query: PLAYLIST_QUERY,
        variables: { id: playlistId },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      const ids = res.data!.playlist.tracks.map((t) => t.id);
      expect(ids).not.toContain(id1);
    });
  });

  // -----------------------------------------------------------------------
  // Reorder
  // -----------------------------------------------------------------------

  describe("Reorder", () => {
    it("reverses track order", async () => {
      // Create playlist with tracks in order
      const createRes = await executeGraphQL<{
        createPlaylist: { id: string };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: {
          input: {
            name: "Reorder Test",
            trackIds: testTrackIds,
          },
        },
        token: userAToken,
      });
      const pid = createRes.data!.createPlaylist.id;

      // Reverse the order
      const reversed = [...testTrackIds].reverse();
      const reorderRes = await executeGraphQL<{
        reorderPlaylistTracks: {
          tracks: Array<{ id: string }>;
        };
      }>(agent, {
        query: REORDER_TRACKS_MUTATION,
        variables: {
          input: { playlistId: pid, trackIds: reversed },
        },
        token: userAToken,
      });

      expect(reorderRes.errors).toBeUndefined();
      expect(reorderRes.data!.reorderPlaylistTracks.tracks.map((t) => t.id)).toEqual(reversed);
    });

    it("rejects mismatched track IDs", async () => {
      const createRes = await executeGraphQL<{
        createPlaylist: { id: string };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: {
          input: {
            name: "Reorder Fail",
            trackIds: [testTrackIds[0]],
          },
        },
        token: userAToken,
      });
      const pid = createRes.data!.createPlaylist.id;

      // Try reordering with wrong track IDs
      const res = await executeGraphQL(agent, {
        query: REORDER_TRACKS_MUTATION,
        variables: {
          input: {
            playlistId: pid,
            trackIds: [testTrackIds[1]],
          },
        },
        token: userAToken,
      });

      expect(res.errors).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  describe("Delete", () => {
    it("deletes an owned playlist", async () => {
      const createRes = await executeGraphQL<{
        createPlaylist: { id: string };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: { input: { name: "To Delete" } },
        token: userAToken,
      });
      const pid = createRes.data!.createPlaylist.id;

      const deleteRes = await executeGraphQL<{ deletePlaylist: boolean }>(
        agent,
        {
          query: DELETE_PLAYLIST_MUTATION,
          variables: { id: pid },
          token: userAToken,
        },
      );

      expect(deleteRes.errors).toBeUndefined();
      expect(deleteRes.data!.deletePlaylist).toBe(true);
    });

    it("returns false when deleting non-existent playlist", async () => {
      const res = await executeGraphQL<{ deletePlaylist: boolean }>(agent, {
        query: DELETE_PLAYLIST_MUTATION,
        variables: { id: "00000000-0000-0000-0000-000000000000" },
        token: userAToken,
      });

      expect(res.errors).toBeUndefined();
      expect(res.data!.deletePlaylist).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Auth guards
  // -----------------------------------------------------------------------

  describe("Auth guards", () => {
    it("rejects myPlaylists without auth", async () => {
      const res = await executeGraphQL(agent, {
        query: MY_PLAYLISTS_QUERY,
      });

      expect(res.data).toBeFalsy();
      expect(res.errors).toBeDefined();
      expect(res.errors![0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("rejects playlist(id) without auth", async () => {
      const res = await executeGraphQL(agent, {
        query: PLAYLIST_QUERY,
        variables: { id: "00000000-0000-0000-0000-000000000000" },
      });

      expect(res.errors).toBeDefined();
      expect(res.errors![0]?.extensions?.code).toBe("UNAUTHENTICATED");
    });

    it("rejects createPlaylist without auth", async () => {
      const res = await executeGraphQL(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: { input: { name: "Should Fail" } },
      });

      expect(res.data).toBeFalsy();
      expect(res.errors).toBeDefined();
    });

    it("rejects addTracksToPlaylist without auth", async () => {
      const res = await executeGraphQL(agent, {
        query: ADD_TRACKS_MUTATION,
        variables: {
          input: {
            playlistId: "00000000-0000-0000-0000-000000000000",
            position: 0,
            trackIds: [],
          },
        },
      });

      expect(res.data).toBeFalsy();
      expect(res.errors).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Ownership
  // -----------------------------------------------------------------------

  describe("Ownership", () => {
    let userAPlaylistId: string;

    beforeAll(async () => {
      const res = await executeGraphQL<{
        createPlaylist: { id: string };
      }>(agent, {
        query: CREATE_PLAYLIST_MUTATION,
        variables: { input: { name: "Only A Can Touch" } },
        token: userAToken,
      });
      userAPlaylistId = res.data!.createPlaylist.id;
    });

    it("rejects updatePlaylist by other user", async () => {
      const res = await executeGraphQL(agent, {
        query: UPDATE_PLAYLIST_MUTATION,
        variables: {
          id: userAPlaylistId,
          input: { name: "Hacked" },
        },
        token: userBToken,
      });

      expect(res.errors).toBeDefined();
      expect(res.errors![0]?.extensions?.code).toBe("FORBIDDEN");
    });

    it("rejects deletePlaylist by other user", async () => {
      const res = await executeGraphQL(agent, {
        query: DELETE_PLAYLIST_MUTATION,
        variables: { id: userAPlaylistId },
        token: userBToken,
      });

      expect(res.errors).toBeDefined();
      expect(res.errors![0]?.extensions?.code).toBe("FORBIDDEN");
    });

    it("rejects addTracksToPlaylist by other user", async () => {
      const res = await executeGraphQL(agent, {
        query: ADD_TRACKS_MUTATION,
        variables: {
          input: {
            playlistId: userAPlaylistId,
            position: 0,
            trackIds: [testTrackIds[0]],
          },
        },
        token: userBToken,
      });

      expect(res.errors).toBeDefined();
      expect(res.errors![0]?.extensions?.code).toBe("FORBIDDEN");
    });

    it("rejects removeTracksFromPlaylist by other user", async () => {
      const res = await executeGraphQL(agent, {
        query: REMOVE_TRACKS_MUTATION,
        variables: {
          input: {
            playlistId: userAPlaylistId,
            trackIds: [testTrackIds[0]],
          },
        },
        token: userBToken,
      });

      expect(res.errors).toBeDefined();
      expect(res.errors![0]?.extensions?.code).toBe("FORBIDDEN");
    });

    it("rejects reorderPlaylistTracks by other user", async () => {
      const res = await executeGraphQL(agent, {
        query: REORDER_TRACKS_MUTATION,
        variables: {
          input: {
            playlistId: userAPlaylistId,
            trackIds: [testTrackIds[0]],
          },
        },
        token: userBToken,
      });

      expect(res.errors).toBeDefined();
      expect(res.errors![0]?.extensions?.code).toBe("FORBIDDEN");
    });
  });
});
