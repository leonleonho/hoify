import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockLogger = { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() };
const mockGetRequest = jest.fn<() => Promise<{ id: string; downloadMeta: unknown; pluginUsed: string | null; status: string } | undefined>>();
const mockSetStatusDownloading = jest.fn<() => Promise<void>>();
const mockSetCompleted = jest.fn<() => Promise<void>>();
const mockSetFailed = jest.fn<() => Promise<void>>();
const mockSaveDownloadState = jest.fn<() => Promise<void>>();
const mockClearStaleState = jest.fn<() => Promise<void>>();

const mockPluginDownload = jest.fn<() => Promise<{ success: boolean; filePath?: string; error?: string }>>();
const mockPluginDownload2 = jest.fn<() => Promise<{ success: boolean; filePath?: string; error?: string }>>();

type CapturedHandler = (job: { data: { requestId: string; artistName: string; albumName?: string | null; songName?: string } }) => Promise<unknown>;
let capturedHandler: CapturedHandler | null = null;

jest.unstable_mockModule("bullmq", () => ({
  Worker: jest.fn((_queueName: string, handler: CapturedHandler, _opts: unknown) => {
    capturedHandler = handler;
    return { on: jest.fn(), close: jest.fn() };
  }),
  Queue: jest.fn(() => ({ add: jest.fn() })),
}));

jest.unstable_mockModule("../../../util/logger", () => ({ logger: mockLogger }));
jest.unstable_mockModule("../../../db/redis", () => ({ connection: {} }));
jest.unstable_mockModule("../queue.js", () => ({ connection: {} }));
jest.unstable_mockModule("../util/db.js", () => ({
  getRequest: mockGetRequest,
  setStatusDownloading: mockSetStatusDownloading,
  setCompleted: mockSetCompleted,
  setFailed: mockSetFailed,
  saveDownloadState: mockSaveDownloadState,
  clearStaleState: mockClearStaleState,
}));
jest.unstable_mockModule("../plugins/registry.js", () => ({
  getEnabledPlugins: jest.fn(() =>
    Promise.resolve([
      {
        name: "slskd",
        download: mockPluginDownload,
        saveState: jest.fn(),
        resumeState: undefined,
      },
      {
        name: "other",
        download: mockPluginDownload2,
        saveState: jest.fn(),
        resumeState: undefined,
      },
    ]),
  ),
}));

await import("../worker.js");

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRequest.mockResolvedValue({
    id: "req-1",
    downloadMeta: null,
    pluginUsed: null,
    status: "pending",
  });
});

describe("music-request worker", () => {
  it("sets downloading, runs plugin, sets completed on success", async () => {
    mockPluginDownload.mockResolvedValue({ success: true, filePath: "/ingest" });

    await capturedHandler!({
      data: { requestId: "req-1", artistName: "Artist", songName: "Song" },
    });

    expect(mockSetStatusDownloading).toHaveBeenCalledWith("req-1");
    expect(mockPluginDownload).toHaveBeenCalledWith({ requestId: "req-1", artistName: "Artist", songName: "Song" });
    expect(mockSetCompleted).toHaveBeenCalledWith("req-1", "/ingest");
    expect(mockSetFailed).not.toHaveBeenCalled();
  });

  it("tries next plugin when first fails, sets failed when all fail", async () => {
    mockPluginDownload.mockResolvedValue({ success: false, error: "peer cancelled" });
    mockPluginDownload2.mockResolvedValue({ success: false, error: "also failed" });

    await capturedHandler!({
      data: { requestId: "req-1", artistName: "Artist", songName: "Song" },
    });

    expect(mockPluginDownload).toHaveBeenCalled();
    expect(mockPluginDownload2).toHaveBeenCalled();
    expect(mockSetFailed).toHaveBeenCalledWith("req-1");
    expect(mockSetCompleted).not.toHaveBeenCalled();
  });

  it("returns early when request row not found", async () => {
    mockGetRequest.mockResolvedValue(undefined);

    await capturedHandler!({
      data: { requestId: "missing", artistName: "Artist", songName: "Song" },
    });

    expect(mockLogger.error).toHaveBeenCalledWith({ requestId: "missing" }, "Music request row not found");
    expect(mockSetStatusDownloading).not.toHaveBeenCalled();
    expect(mockSetCompleted).not.toHaveBeenCalled();
    expect(mockSetFailed).not.toHaveBeenCalled();
  });

  it("resumes plugin when downloadMeta and pluginUsed exist with fresh timestamp", async () => {
    mockGetRequest.mockResolvedValue({
      id: "req-1",
      downloadMeta: { pollStartedAt: new Date(Date.now() - 60_000).toISOString() },
      pluginUsed: "slskd",
      status: "downloading",
    });
    mockPluginDownload.mockResolvedValue({ success: true, filePath: "/ingest" });

    await capturedHandler!({
      data: { requestId: "req-1", artistName: "Artist", songName: "Song" },
    });

    expect(mockPluginDownload).toHaveBeenCalled();
    expect(mockSetCompleted).toHaveBeenCalledWith("req-1", "/ingest");
  });

  it("clears stale state when downloadMeta expired", async () => {
    mockGetRequest.mockResolvedValue({
      id: "req-1",
      downloadMeta: { pollStartedAt: new Date(Date.now() - 700_000).toISOString() },
      pluginUsed: "slskd",
      status: "downloading",
    });
    mockPluginDownload.mockResolvedValue({ success: true, filePath: "/ingest" });

    await capturedHandler!({
      data: { requestId: "req-1", artistName: "Artist", songName: "Song" },
    });

    expect(mockClearStaleState).toHaveBeenCalledWith("req-1");
    expect(mockPluginDownload).toHaveBeenCalled();
    expect(mockSetCompleted).toHaveBeenCalledWith("req-1", "/ingest");
  });

  it("skips non-matching plugins when resuming", async () => {
    mockGetRequest.mockResolvedValue({
      id: "req-1",
      downloadMeta: { pollStartedAt: new Date(Date.now() - 60_000).toISOString() },
      pluginUsed: "other",
      status: "downloading",
    });
    mockPluginDownload2.mockResolvedValue({ success: true });

    await capturedHandler!({
      data: { requestId: "req-1", artistName: "Artist", songName: "Song" },
    });

    expect(mockPluginDownload).not.toHaveBeenCalled();
    expect(mockPluginDownload2).toHaveBeenCalled();
  });
});
