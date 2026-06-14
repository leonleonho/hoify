import {
  fmtDate,
  listMyPlaylists,
  getPlaylistById,
  createPlaylist as createPlaylistSvc,
  updatePlaylist as updatePlaylistSvc,
  deletePlaylist as deletePlaylistSvc,
  addTracksToPlaylist as addTracksSvc,
  removeTracksFromPlaylist as removeTracksSvc,
  reorderPlaylistTracks as reorderTracksSvc,
  getPlaylistTracks,
  getPlaylistTrackCount,
  likeTrack as likeTrackSvc,
  unlikeTrack as unlikeTrackSvc,
} from "./services.js";
import type { Context } from "../auth/resolvers.js";

export const resolvers = {
  Playlist: {
    tracks: (parent: { id: string }) => getPlaylistTracks(parent.id),
    trackCount: (parent: { id: string }) => getPlaylistTrackCount(parent.id),
    createdAt: (parent: { createdAt: Date | string }) => fmtDate(parent.createdAt),
    updatedAt: (parent: { updatedAt: Date | string }) => fmtDate(parent.updatedAt),
    type: (parent: { type: string | null }) => parent.type ?? null,
  },

  PlaylistType: {
    liked: "liked",
    suggested: "suggested",
  },

  Query: {
    myPlaylists: (
      _: unknown,
      args: { type?: string | null },
      context: Context,
    ) => listMyPlaylists(context.currentUser!.id, args.type),

    playlist: async (
      _: unknown,
      args: { id: string },
      context: Context,
    ) => {
      const playlist = await getPlaylistById(args.id);
      if (!playlist) return null;

      // Owner can always view; anyone can view public playlists
      if (
        playlist.userId === context.currentUser!.id ||
        playlist.isPublic
      ) {
        return playlist;
      }

      return null;
    },
  },

  Mutation: {
    createPlaylist: (
      _: unknown,
      args: {
        input: {
          name: string;
          description?: string | null;
          isPublic?: boolean | null;
          trackIds?: string[] | null;
        };
      },
      context: Context,
    ) => createPlaylistSvc(args.input, context.currentUser!.id),

    updatePlaylist: (
      _: unknown,
      args: { id: string; input: { name?: string | null; description?: string | null; isPublic?: boolean | null } },
      context: Context,
    ) => updatePlaylistSvc(args.id, args.input, context.currentUser!.id),

    deletePlaylist: (
      _: unknown,
      args: { id: string },
      context: Context,
    ) => deletePlaylistSvc(args.id, context.currentUser!.id),

    addTracksToPlaylist: (
      _: unknown,
      args: { input: { playlistId: string; position: number; trackIds: string[] } },
      context: Context,
    ) => addTracksSvc(args.input.playlistId, args.input.position, args.input.trackIds, context.currentUser!.id),

    removeTracksFromPlaylist: (
      _: unknown,
      args: { input: { playlistId: string; trackIds: string[] } },
      context: Context,
    ) => removeTracksSvc(args.input.playlistId, args.input.trackIds, context.currentUser!.id),

    reorderPlaylistTracks: (
      _: unknown,
      args: { input: { playlistId: string; trackIds: string[] } },
      context: Context,
    ) => reorderTracksSvc(args.input.playlistId, args.input.trackIds, context.currentUser!.id),

    likeTrack: (
      _: unknown,
      args: { trackId: string },
      context: Context,
    ) => likeTrackSvc(context.currentUser!.id, args.trackId),

    unlikeTrack: (
      _: unknown,
      args: { trackId: string },
      context: Context,
    ) => unlikeTrackSvc(context.currentUser!.id, args.trackId),
  },
};
