import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { GraphQLError } from "graphql";

const mockIsSlskdEnabled = jest.fn(() => true);
const mockStartSearch = jest.fn(async () => ({ id: "search-1" }));
const mockGetSearchStatus = jest.fn();
const mockGetSearchResponses = jest.fn(async () => []);
const mockCancelSearch = jest.fn(async () => undefined);
const mockWaitForSearchResponses = jest.fn(async () => []);
const mockGroupByPeerAndFolder = jest.fn(() => []);
const mockShouldFinalizeSearch = jest.fn(() => false);
const mockClearSearchStart = jest.fn();
const mockGetFinalizedSearch = jest.fn(() => undefined);
const mockSetFinalizedSearch = jest.fn();
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
  cancelSearch: mockCancelSearch,
  waitForSearchResponses: mockWaitForSearchResponses,
  groupByPeerAndFolder: mockGroupByPeerAndFolder,
  shouldFinalizeSearch: mockShouldFinalizeSearch,
  clearSearchStart: mockClearSearchStart,
  getFinalizedSearch: mockGetFinalizedSearch,
  setFinalizedSearch: mockSetFinalizedSearch,
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
  mockShouldFinalizeSearch.mockReturnValue(false);
  mockGetFinalizedSearch.mockReturnValue(undefined);
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

  it("downloadSearch returns live counts without fetching peers while incomplete", async () => {
    mockGetSearchStatus.mockResolvedValue({
      id: "s1",
      searchText: "q",
      isComplete: false,
      fileCount: 42,
      responseCount: 7,
    });

    const result = await resolvers.Query.downloadSearch(null, { id: "s1" });

    expect(result.isComplete).toBe(false);
    expect(result.peers).toEqual([]);
    expect(result.fileCount).toBe(42);
    expect(result.responseCount).toBe(7);
    expect(mockGetSearchResponses).not.toHaveBeenCalled();
    expect(mockCancelSearch).not.toHaveBeenCalled();
    expect(mockSetFinalizedSearch).not.toHaveBeenCalled();
  });

  it("downloadSearch ignores early slskd completion until finalize conditions", async () => {
    mockGetSearchStatus.mockResolvedValue({
      id: "s1",
      searchText: "q",
      isComplete: true,
      fileCount: 99,
      responseCount: 5,
    });
    mockShouldFinalizeSearch.mockReturnValue(false);

    const result = await resolvers.Query.downloadSearch(null, { id: "s1" });

    expect(result.isComplete).toBe(false);
    expect(result.peers).toEqual([]);
    expect(result.fileCount).toBe(99);
    expect(result.responseCount).toBe(5);
    expect(mockCancelSearch).not.toHaveBeenCalled();
    expect(mockGetSearchResponses).not.toHaveBeenCalled();
    expect(mockWaitForSearchResponses).not.toHaveBeenCalled();
  });

  it("downloadSearch cancels and waits for flush when ready", async () => {
    mockGetSearchStatus.mockResolvedValue({
      id: "s1",
      searchText: "q",
      isComplete: false,
      fileCount: 10,
      responseCount: 16,
    });
    mockShouldFinalizeSearch.mockReturnValue(true);
    mockWaitForSearchResponses.mockResolvedValue([
      { username: "p", files: [{ filename: "a.flac", size: 1 }] },
    ]);
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

    expect(mockShouldFinalizeSearch).toHaveBeenCalledWith("s1", undefined, 16);
    expect(result.isComplete).toBe(true);
    expect(mockCancelSearch).toHaveBeenCalledWith("s1");
    expect(mockWaitForSearchResponses).toHaveBeenCalledWith("s1");
    expect(mockGetSearchResponses).not.toHaveBeenCalled();
    expect(result.peers).toHaveLength(1);
    expect(result.fileCount).toBe(1);
    expect(mockSetFinalizedSearch).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1", isComplete: true, fileCount: 1 }),
    );
  });

  it("downloadSearch returns cached finalize without re-running cancel/wait", async () => {
    const cached = {
      id: "s1",
      query: "q",
      isComplete: true as const,
      fileCount: 1,
      responseCount: 1,
      peers: [],
    };
    mockGetFinalizedSearch.mockReturnValue(cached);

    const result = await resolvers.Query.downloadSearch(null, { id: "s1" });

    expect(result).toBe(cached);
    expect(mockGetSearchStatus).not.toHaveBeenCalled();
    expect(mockCancelSearch).not.toHaveBeenCalled();
    expect(mockWaitForSearchResponses).not.toHaveBeenCalled();
  });

  it("downloadSearch skips cancel when slskd already complete at finalize", async () => {
    mockGetSearchStatus.mockResolvedValue({
      id: "s1",
      searchText: "q",
      isComplete: true,
      fileCount: 5,
      responseCount: 2,
    });
    mockShouldFinalizeSearch.mockReturnValue(true);
    mockWaitForSearchResponses.mockResolvedValue([]);
    mockGroupByPeerAndFolder.mockReturnValue([]);

    const result = await resolvers.Query.downloadSearch(null, { id: "s1" });

    expect(result.isComplete).toBe(true);
    expect(mockCancelSearch).not.toHaveBeenCalled();
    expect(mockWaitForSearchResponses).toHaveBeenCalledWith("s1");
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

  it("persists successes then throws when some files fail to enqueue", async () => {
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
      failed: [{ filename: "b.flac" }],
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

    await expect(
      resolvers.Mutation.startDownload(
        null,
        {
          peer: "peer",
          files: [
            { filename: "a.flac", size: 100 },
            { filename: "b.flac", size: 50 },
          ],
        },
        context,
      ),
    ).rejects.toMatchObject({
      message: "Enqueued 1 file(s), but 1 failed",
      extensions: { code: "PARTIAL_ENQUEUE_FAILURE" },
    });

    expect(values).toHaveBeenCalled();
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
