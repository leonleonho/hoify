import { and, eq, gte, inArray, sql, count } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { db } from "../../db/index.js";
import {
  playlists,
  playlistTracks,
  tracks,
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

async function getOwnedPlaylistOrThrow(
  playlistId: string,
  userId: string,
) {
  const [playlist] = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));

  if (!playlist) {
    throw new GraphQLError("Playlist not found or access denied", {
      extensions: { code: "FORBIDDEN" },
    });
  }
  return playlist;
}

async function validateTrackIds(trackIds: string[]) {
  const existing = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(inArray(tracks.id, trackIds));

  const existingSet = new Set(existing.map((t) => t.id));
  const missing = trackIds.filter((id) => !existingSet.has(id));
  if (missing.length > 0) {
    throw new GraphQLError(`Tracks not found: ${missing.join(", ")}`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listMyPlaylists(userId: string) {
  return db
    .select()
    .from(playlists)
    .where(eq(playlists.userId, userId))
    .orderBy(sql`${playlists.createdAt} desc`);
}

export async function getPlaylistById(id: string) {
  const [row] = await db.select().from(playlists).where(eq(playlists.id, id));
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createPlaylist(
  input: {
    name: string;
    description?: string | null;
    isPublic?: boolean | null;
    trackIds?: string[] | null;
  },
  userId: string,
) {
  const [playlist] = await db
    .insert(playlists)
    .values({
      name: input.name,
      description: input.description ?? null,
      isPublic: input.isPublic ?? false,
      userId,
    })
    .returning();

  if (input.trackIds && input.trackIds.length > 0) {
    await validateTrackIds(input.trackIds);

    const rows = input.trackIds.map((trackId, i) => ({
      playlistId: playlist.id,
      trackId,
      position: i,
    }));
    await db.insert(playlistTracks).values(rows);
  }

  return playlist;
}

export async function updatePlaylist(
  id: string,
  input: { name?: string | null; description?: string | null; isPublic?: boolean | null },
  userId: string,
) {
  await getOwnedPlaylistOrThrow(id, userId);

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined && input.name !== null) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.isPublic !== undefined && input.isPublic !== null) patch.isPublic = input.isPublic;

  if (Object.keys(patch).length === 0) {
    const [current] = await db.select().from(playlists).where(eq(playlists.id, id));
    return current ?? null;
  }

  const [row] = await db
    .update(playlists)
    .set(patch)
    .where(eq(playlists.id, id))
    .returning();

  return row ?? null;
}

export async function deletePlaylist(id: string, userId: string) {
  const [playlist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, id));

  if (!playlist) return false;

  if (playlist.userId !== userId) {
    throw new GraphQLError("Playlist not found or access denied", {
      extensions: { code: "FORBIDDEN" },
    });
  }

  await db.delete(playlists).where(eq(playlists.id, id));

  return true;
}

export async function addTracksToPlaylist(
  playlistId: string,
  position: number,
  trackIds: string[],
  userId: string,
) {
  await getOwnedPlaylistOrThrow(playlistId, userId);
  await validateTrackIds(trackIds);

  // Shift existing tracks at >= position up
  await db
    .update(playlistTracks)
    .set({ position: sql`${playlistTracks.position} + ${trackIds.length}` })
    .where(
      and(
        eq(playlistTracks.playlistId, playlistId),
        gte(playlistTracks.position, position),
      ),
    );

  // Insert new tracks with sequential positions
  const rows = trackIds.map((trackId, i) => ({
    playlistId,
    trackId,
    position: position + i,
  }));
  await db.insert(playlistTracks).values(rows);

  const [playlist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId));

  return playlist ?? null;
}

export async function removeTracksFromPlaylist(
  playlistId: string,
  trackIds: string[],
  userId: string,
) {
  await getOwnedPlaylistOrThrow(playlistId, userId);

  await db
    .delete(playlistTracks)
    .where(
      and(
        eq(playlistTracks.playlistId, playlistId),
        inArray(playlistTracks.trackId, trackIds),
      ),
    );

  const [playlist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId));

  return playlist ?? null;
}

export async function reorderPlaylistTracks(
  playlistId: string,
  trackIds: string[],
  userId: string,
) {
  await getOwnedPlaylistOrThrow(playlistId, userId);

  // Verify the provided set matches current tracks
  const current = await db
    .select({ trackId: playlistTracks.trackId })
    .from(playlistTracks)
    .where(eq(playlistTracks.playlistId, playlistId));

  const currentIds = current.map((t) => t.trackId).sort();
  const newIds = [...trackIds].sort();
  if (
    currentIds.length !== newIds.length ||
    !currentIds.every((id, i) => id === newIds[i])
  ) {
    throw new GraphQLError(
      "Provided track IDs must match the current playlist tracks exactly",
      { extensions: { code: "BAD_USER_INPUT" } },
    );
  }

  // Delete all and re-insert with new positions
  await db.transaction(async (tx) => {
    await tx
      .delete(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlistId));

    await tx.insert(playlistTracks).values(
      trackIds.map((trackId, i) => ({
        playlistId,
        trackId,
        position: i,
      })),
    );
  });

  const [playlist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId));

  return playlist ?? null;
}

// ---------------------------------------------------------------------------
// Field resolvers
// ---------------------------------------------------------------------------

export async function getPlaylistTracks(playlistId: string) {
  const rows = await db
    .select({ track: tracks })
    .from(playlistTracks)
    .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
    .where(eq(playlistTracks.playlistId, playlistId))
    .orderBy(playlistTracks.position);

  return rows.map((r) => r.track);
}

export async function getPlaylistTrackCount(playlistId: string) {
  const [row] = await db
    .select({ count: count() })
    .from(playlistTracks)
    .where(eq(playlistTracks.playlistId, playlistId));

  return row?.count ?? 0;
}
