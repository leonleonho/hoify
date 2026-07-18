import { and, desc, eq } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { db } from "../../db/index.js";
import {
  musicDownloads,
  type MusicDownload as MusicDownloadRow,
} from "../../db/schema.js";
import {
  cancelSearch,
  clearSearchStart,
  enqueueDownloads,
  getSearchStatus,
  getTransfer,
  groupByPeerAndFolder,
  isSlskdEnabled,
  isTerminalStatus,
  mapTransferStatus,
  shouldFinalizeSearch,
  startSearch,
  waitForSearchResponses,
  type DownloadStatus,
} from "../../services/slskd/index.js";
import { fmtDate } from "../music/services.js";
import type { Context } from "../auth/resolvers.js";

function requireProviderEnabled(): void {
  if (!isSlskdEnabled()) {
    throw new GraphQLError("Download provider is not enabled", {
      extensions: { code: "DOWNLOAD_PROVIDER_DISABLED" },
    });
  }
}

function requireNonEmptyQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new GraphQLError("Query must not be empty", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
  return trimmed;
}

interface DownloadView {
  id: string;
  peer: string;
  filename: string;
  size: number;
  status: DownloadStatus;
  percentComplete: number | null;
  bytesTransferred: number | null;
  averageSpeed: number | null;
  createdAt: Date | string;
}

async function enrichDownload(row: MusicDownloadRow): Promise<DownloadView> {
  const base: DownloadView = {
    id: row.id,
    peer: row.peer,
    filename: row.filename,
    size: row.size,
    status: row.status as DownloadStatus,
    percentComplete: null,
    bytesTransferred: null,
    averageSpeed: null,
    createdAt: row.createdAt,
  };

  if (isTerminalStatus(row.status as DownloadStatus)) {
    if (row.status === "completed") {
      base.percentComplete = 100;
      base.bytesTransferred = row.size;
    }
    return base;
  }

  try {
    const transfer = await getTransfer(row.peer, row.externalId);
    const status = mapTransferStatus(transfer.state);
    base.status = status;
    base.percentComplete = transfer.percentComplete ?? null;
    base.bytesTransferred = transfer.bytesTransferred ?? null;
    base.averageSpeed = transfer.averageSpeed ?? null;

    if (status !== row.status) {
      await db
        .update(musicDownloads)
        .set({ status })
        .where(eq(musicDownloads.id, row.id));
    }
  } catch {
    // Keep cached status if provider lookup fails
  }

  return base;
}

export const resolvers = {
  MusicDownload: {
    createdAt: (parent: { createdAt: Date | string }) => fmtDate(parent.createdAt),
  },

  Query: {
    startDownloadSearch: async (_: unknown, args: { query: string }) => {
      requireProviderEnabled();
      const query = requireNonEmptyQuery(args.query);
      const { id } = await startSearch(query);

      return {
        id,
        query,
        isComplete: false,
        fileCount: 0,
        responseCount: 0,
        peers: [],
      };
    },

    downloadSearch: async (_: unknown, args: { id: string }) => {
      requireProviderEnabled();

      const status = await getSearchStatus(args.id);
      // Own the cutoff: ignore early slskd completion. Finalize after 10s or
      // once >15 peers have responded, then cancel to flush responses to DB.
      const ready = shouldFinalizeSearch(
        args.id,
        status.startedAt,
        status.responseCount,
      );

      if (!ready) {
        return {
          id: status.id,
          query: status.searchText ?? "",
          isComplete: false,
          fileCount: status.fileCount ?? 0,
          responseCount: status.responseCount ?? 0,
          peers: [],
        };
      }

      if (!status.isComplete) {
        try {
          await cancelSearch(args.id);
        } catch {
          // Search may already be completing; still wait for flush below.
        }
      }

      const responses = await waitForSearchResponses(args.id);
      const peers = groupByPeerAndFolder(responses);
      clearSearchStart(args.id);

      const fileCount = peers.reduce(
        (sum, peer) =>
          sum + peer.folders.reduce((s, folder) => s + folder.files.length, 0),
        0,
      );

      return {
        id: status.id,
        query: status.searchText ?? "",
        isComplete: true,
        fileCount,
        responseCount: peers.length,
        peers,
      };
    },

    downloads: async (_: unknown, __: unknown, context: Context) => {
      requireProviderEnabled();
      const rows = await db
        .select()
        .from(musicDownloads)
        .where(eq(musicDownloads.userId, context.currentUser!.id))
        .orderBy(desc(musicDownloads.createdAt))
        .limit(20);

      return Promise.all(rows.map(enrichDownload));
    },

    download: async (
      _: unknown,
      args: { id: string },
      context: Context,
    ) => {
      requireProviderEnabled();
      const [row] = await db
        .select()
        .from(musicDownloads)
        .where(
          and(
            eq(musicDownloads.id, args.id),
            eq(musicDownloads.userId, context.currentUser!.id),
          ),
        );

      if (!row) return null;
      return enrichDownload(row);
    },
  },

  Mutation: {
    startDownload: async (
      _: unknown,
      args: {
        peer: string;
        files: Array<{ filename: string; size: number }>;
      },
      context: Context,
    ) => {
      requireProviderEnabled();

      if (!args.peer.trim()) {
        throw new GraphQLError("peer must not be empty", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      if (!args.files?.length) {
        throw new GraphQLError("files must not be empty", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      let enqueued;
      try {
        ({ enqueued } = await enqueueDownloads(args.peer, args.files));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new GraphQLError(`Failed to enqueue download: ${msg}`, {
          extensions: { code: "INTERNAL_ERROR" },
        });
      }

      if (!enqueued?.length) {
        throw new GraphQLError("No files were enqueued for download", {
          extensions: { code: "INTERNAL_ERROR" },
        });
      }

      const inserted = await db
        .insert(musicDownloads)
        .values(
          enqueued.map((t) => ({
            userId: context.currentUser!.id,
            peer: args.peer,
            externalId: String(t.id),
            filename: t.filename,
            size: t.size,
            status: mapTransferStatus(t.state),
          })),
        )
        .returning();

      return inserted.map((row) => ({
        id: row.id,
        peer: row.peer,
        filename: row.filename,
        size: row.size,
        status: row.status,
        percentComplete: null,
        bytesTransferred: null,
        averageSpeed: null,
        createdAt: row.createdAt,
      }));
    },
  },
};
