import { eq, desc } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { db } from "../../db/index.js";
import { musicRequests } from "../../db/schema.js";
import { getMusicRequestQueue } from "../../jobs/music-request/queue.js";
import { fmtDate } from "../music/services.js";
import type { Context } from "../auth/resolvers.js";

export const resolvers = {
  MusicRequest: {
    createdAt: (parent: { createdAt: Date | string }) => fmtDate(parent.createdAt),
  },

  Query: {
    musicRequests: (_: unknown, __: unknown, context: Context) =>
      db
        .select()
        .from(musicRequests)
        .where(eq(musicRequests.userId, context.currentUser!.id))
        .orderBy(desc(musicRequests.createdAt)),
  },

  Mutation: {
    requestMusicDownload: async (
      _: unknown,
      args: { artistName: string; albumName?: string; songName?: string },
      context: Context,
    ) => {
      const { artistName, albumName, songName } = args;

      if (!albumName && !songName) {
        throw new GraphQLError("Must provide albumName or songName", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const [request] = await db
        .insert(musicRequests)
        .values({
          userId: context.currentUser!.id,
          artistName,
          albumName: albumName ?? null,
          songName: songName ?? null,
        })
        .returning();

      try {
        await getMusicRequestQueue().add("request", {
          requestId: request.id,
          artistName,
          albumName: albumName ?? null,
          songName,
        });
      } catch {
        await db.delete(musicRequests).where(eq(musicRequests.id, request.id));
        throw new GraphQLError("Failed to enqueue music request", {
          extensions: { code: "INTERNAL_ERROR" },
        });
      }

      return request;
    },
  },
};
