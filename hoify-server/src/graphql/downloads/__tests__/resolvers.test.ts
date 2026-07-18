import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { GraphQLError } from "graphql";

const mockIsSlskdEnabled = jest.fn(() => true);
const mockStartSearch = jest.fn(async () => ({ id: "search-1" }));
const mockGetSearchStatus = jest.fn();
const mockGetSearchResponses = jest.fn(async () => []);
const mockGroupByPeerAndFolder = jest.fn(() => []);
const mockIsSearchTimedOut = jest.fn(() => false);
const mockClearSearchStart = jest.fn();
const mockEnqueueDownloads = jest.fn();
const mockGetTransfer = jest.fn();
const mockMapTransferStatus = jest.fn((state: string) => {
  if (state.includes("Succeeded")) return "completed";
  if (state.includes("Progress")) return "downloading";
  return "queued";
});
const mockIsTerminalStatus = jest.fn(
  (status: string) =>
    status === "completed" || status === "failed" || status === "cancelled",
);

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();

jest.unstable_mockModule("../../../services/slskd/index.js", () => ({
  isSlskdEnabled: mockIsSlskdEnabled,
  startSearch: mockStartSearch,
  getSearchStatus: mockGetSearchStatus,
  getSearchResponses: mockGetSearchResponses,
  groupByPeerAndFolder: mockGroupByPeerAndFolder,
  isSearchTimedOut: mockIsSearchTimedOut,
  clearSearchStart: mockClearSearchStart,
  enqueueDownloads: mockEnqueueDownloads,
  getTransfer: mockGetTransfer,
  mapTransferStatus: mockMapTransferStatus,
  isTerminalStatus: mockIsTerminalStatus,
}));

jest.unstable_mockModule("../../../db/index.js", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
}));

const { resolvers } = await import("../resolvers.js");

const context = {
  currentUser: { id: "user-1" },
} as never;

beforeEach(() => {
  jest.clearAllMocks();
  mockIsSlskdEnabled.mockReturnValue(true);
  mockIsSearchTimedOut.mockReturnValue(false);
  mockGroupByPeerAndFolder.mockReturnValue([]);
  mockGetSearchResponses.mockResolvedValue([]);
  mockIsTerminalStatus.mockImplementation(
    (status: string) =>
      status === "completed" || status === "failed" || status === "cancelled",
  );
  mockMapTransferStatus.mockImplementation((state: string) => {
    if (state.includes("Succeeded")) return "completed";
    if (state.includes("Progress")) return "downloading";
    return "queued";
  });
});

describe("downloads resolvers — provider gate", () => {
  it("startDownloadSearch throws when provider disabled", async () => {
    mockIsSlskdEnabled.mockReturnValue(false);
    await expect(
      resolvers.Query.startDownloadSearch(null, { query: "x" }),
    ).rejects.toMatchObject({
      extensions: { code: "DOWNLOAD_PROVIDER_DISABLED" },
    });
  });

  it("startDownloadSearch rejects empty query", async () => {
    await expect(
      resolvers.Query.startDownloadSearch(null, { query: "   " }),
    ).rejects.toBeInstanceOf(GraphQLError);
  });
});

describe("downloads resolvers — search", () => {
  it("startDownloadSearch starts provider search", async () => {
    mockStartSearch.mockResolvedValue({ id: "abc" });
    const result = await resolvers.Query.startDownloadSearch(null, {
      query: " Radiohead ",
    });

    expect(mockStartSearch).toHaveBeenCalledWith("Radiohead");
    expect(result).toEqual({
      id: "abc",
      query: "Radiohead",
      isComplete: false,
      fileCount: 0,
      responseCount: 0,
      peers: [],
    });
  });

  it("downloadSearch returns partial peers while incomplete", async () => {
    mockGetSearchStatus.mockResolvedValue({
      id: "s1",
      searchText: "q",
      isComplete: false,
    });
    mockGetSearchResponses.mockResolvedValue([{ username: "p", files: [] }]);
    mockGroupByPeerAndFolder.mockReturnValue([
      {
        peer: "p",
        hasFreeUploadSlot: true,
        uploadSpeed: 1,
        queueLength: 0,
        folders: [
          {
            name: ".",
            files: [
              {
                filename: "a.flac",
                size: 1,
                extension: "flac",
                bitRate: null,
                bitDepth: null,
                sampleRate: null,
                isLocked: null,
              },
            ],
          },
        ],
      },
    ]);

    const result = await resolvers.Query.downloadSearch(null, { id: "s1" });

    expect(result.isComplete).toBe(false);
    expect(result.peers).toHaveLength(1);
    expect(result.fileCount).toBe(1);
    expect(mockClearSearchStart).not.toHaveBeenCalled();
  });

  it("downloadSearch marks complete on timeout and clears start", async () => {
    mockGetSearchStatus.mockResolvedValue({
      id: "s1",
      searchText: "q",
      isComplete: false,
    });
    mockIsSearchTimedOut.mockReturnValue(true);
    mockGroupByPeerAndFolder.mockReturnValue([]);

    const result = await resolvers.Query.downloadSearch(null, { id: "s1" });

    expect(result.isComplete).toBe(true);
    expect(mockClearSearchStart).toHaveBeenCalledWith("s1");
  });
});

describe("downloads resolvers — startDownload", () => {
  it("rejects empty peer or files", async () => {
    await expect(
      resolvers.Mutation.startDownload(
        null,
        { peer: " ", files: [{ filename: "a.flac", size: 1 }] },
        context,
      ),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });

    await expect(
      resolvers.Mutation.startDownload(
        null,
        { peer: "peer", files: [] },
        context,
      ),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
  });

  it("enqueues files and inserts DB rows", async () => {
    mockEnqueueDownloads.mockResolvedValue({
      enqueued: [
        {
          id: 9,
          username: "peer",
          filename: "a.flac",
          size: 100,
          state: "Queued",
        },
      ],
      failed: [],
    });

    const returning = jest.fn(async () => [
      {
        id: "dl-1",
        peer: "peer",
        filename: "a.flac",
        size: 100,
        status: "queued",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);
    const values = jest.fn(() => ({ returning }));
    mockInsert.mockReturnValue({ values });

    const result = await resolvers.Mutation.startDownload(
      null,
      { peer: "peer", files: [{ filename: "a.flac", size: 100 }] },
      context,
    );

    expect(mockEnqueueDownloads).toHaveBeenCalledWith("peer", [
      { filename: "a.flac", size: 100 },
    ]);
    expect(values).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: "user-1",
        peer: "peer",
        externalId: "9",
        filename: "a.flac",
        size: 100,
        status: "queued",
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dl-1");
  });

  it("throws when enqueue returns no transfers", async () => {
    mockEnqueueDownloads.mockResolvedValue({ enqueued: [], failed: [] });

    await expect(
      resolvers.Mutation.startDownload(
        null,
        { peer: "peer", files: [{ filename: "a.flac", size: 1 }] },
        context,
      ),
    ).rejects.toMatchObject({ extensions: { code: "INTERNAL_ERROR" } });
  });
});

describe("downloads resolvers — download progress", () => {
  it("download returns null when row missing", async () => {
    const where = jest.fn(async () => []);
    mockSelect.mockReturnValue({
      from: () => ({ where }),
    });

    const result = await resolvers.Query.download(
      null,
      { id: "missing" },
      context,
    );
    expect(result).toBeNull();
  });

  it("download enriches active transfer from provider", async () => {
    const row = {
      id: "dl-1",
      userId: "user-1",
      peer: "peer",
      externalId: "9",
      filename: "a.flac",
      size: 1000,
      status: "queued",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const where = jest.fn(async () => [row]);
    mockSelect.mockReturnValue({
      from: () => ({ where }),
    });

    mockGetTransfer.mockResolvedValue({
      id: 9,
      state: "InProgress",
      percentComplete: 55,
      bytesTransferred: 550,
      averageSpeed: 100,
    });

    const updateWhere = jest.fn(async () => undefined);
    mockUpdate.mockReturnValue({
      set: () => ({ where: updateWhere }),
    });

    const result = await resolvers.Query.download(
      null,
      { id: "dl-1" },
      context,
    );

    expect(result).toMatchObject({
      id: "dl-1",
      status: "downloading",
      percentComplete: 55,
      bytesTransferred: 550,
      averageSpeed: 100,
    });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("download skips provider fetch for completed rows", async () => {
    const row = {
      id: "dl-2",
      userId: "user-1",
      peer: "peer",
      externalId: "9",
      filename: "a.flac",
      size: 1000,
      status: "completed",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    };
    mockSelect.mockReturnValue({
      from: () => ({ where: jest.fn(async () => [row]) }),
    });

    const result = await resolvers.Query.download(
      null,
      { id: "dl-2" },
      context,
    );

    expect(mockGetTransfer).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "completed",
      percentComplete: 100,
      bytesTransferred: 1000,
    });
  });
});
