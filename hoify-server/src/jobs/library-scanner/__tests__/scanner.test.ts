import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const actualFs = require("node:fs/promises") as typeof import("node:fs/promises");

const mockStat = jest.fn<(path: string) => Promise<{ mtimeMs: number }>>();
const mockAdd = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRecordScanState = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSelectFrom = jest.fn();

jest.unstable_mockModule("node:fs/promises", () => ({
  ...actualFs,
  stat: mockStat,
}));

jest.unstable_mockModule("../../../db/index.js", () => ({
  db: {
    select: () => ({
      from: mockSelectFrom,
    }),
  },
}));

jest.unstable_mockModule("../../enrichment/queue.js", () => ({
  getEnrichmentQueue: () => ({ add: mockAdd }),
}));

jest.unstable_mockModule("../../enrichment/storage/scanState.js", () => ({
  recordScanState: mockRecordScanState,
}));

jest.unstable_mockModule("../../../util/logger.js", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { enqueueTracks } = await import("../scanner.js");

describe("enqueueTracks", () => {
  beforeEach(() => {
    mockStat.mockReset();
    mockAdd.mockReset();
    mockRecordScanState.mockReset();
    mockSelectFrom.mockReset();
    mockAdd.mockResolvedValue(undefined);
    mockRecordScanState.mockResolvedValue(undefined);
  });

  it("skips files with terminal status and matching mtime", async () => {
    mockSelectFrom.mockResolvedValue([
      { filePath: "/music/a.mp3", fileMtime: 1000, status: "ok" },
    ]);
    mockStat.mockResolvedValue({ mtimeMs: 1000 });

    const summary = await enqueueTracks(["/music/a.mp3"]);

    expect(summary.skipped).toBe(1);
    expect(summary.filesFound).toBe(1);
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockRecordScanState).not.toHaveBeenCalled();
  });

  it("re-enqueues pending rows with matching mtime", async () => {
    mockSelectFrom.mockResolvedValue([
      { filePath: "/music/a.mp3", fileMtime: 1000, status: "pending" },
    ]);
    mockStat.mockResolvedValue({ mtimeMs: 1000 });

    const summary = await enqueueTracks(["/music/a.mp3"]);

    expect(summary.skipped).toBe(0);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockRecordScanState).toHaveBeenCalledWith(
      "/music/a.mp3",
      1000,
      "pending",
    );
  });

  it("enqueues new files and records pending scan state", async () => {
    mockSelectFrom.mockResolvedValue([]);
    mockStat.mockResolvedValue({ mtimeMs: 2000.9 });

    const summary = await enqueueTracks(["/music/new.mp3"]);

    expect(summary.skipped).toBe(0);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd.mock.calls[0]![1]).toEqual({ filePath: "/music/new.mp3" });
    expect(mockRecordScanState).toHaveBeenCalledWith(
      "/music/new.mp3",
      2000,
      "pending",
    );
  });

  it("re-enqueues when mtime changed", async () => {
    mockSelectFrom.mockResolvedValue([
      { filePath: "/music/a.mp3", fileMtime: 1000, status: "ok" },
    ]);
    mockStat.mockResolvedValue({ mtimeMs: 3000 });

    await enqueueTracks(["/music/a.mp3"]);

    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockRecordScanState).toHaveBeenCalledWith(
      "/music/a.mp3",
      3000,
      "pending",
    );
  });
});
