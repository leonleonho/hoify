import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockLogger = { debug: jest.fn(), warn: jest.fn(), info: jest.fn() };
const mockParseFile = jest.fn();
const mockIdentify = jest.fn();
const mockUpsertOne = jest.fn();
const mockSaveAlbumArt = jest.fn();

let capturedHandler: ((job: { data: { filePath: string }; attemptsMade: number }) => Promise<unknown>) | null = null;

jest.unstable_mockModule("bullmq", () => ({
  Worker: jest.fn((_queueName: string, handler: typeof capturedHandler, _opts: unknown) => {
    capturedHandler = handler;
    return { on: jest.fn(), close: jest.fn() };
  }),
  Queue: jest.fn(() => ({ add: jest.fn() })),
}));

jest.unstable_mockModule("../parser.js", () => ({ parseFile: mockParseFile }));
jest.unstable_mockModule("../identification/identify.js", () => ({ identify: mockIdentify }));
jest.unstable_mockModule("../storage/storageUtils.js", () => ({
  upsertOne: mockUpsertOne,
  saveAlbumArt: mockSaveAlbumArt,
}));
jest.unstable_mockModule("../../../util/logger", () => ({ logger: mockLogger }));
jest.unstable_mockModule("../../../db/redis", () => ({ connection: {} }));
jest.unstable_mockModule("../queue.js", () => ({
  connection: {},
  enrichmentQueue: { add: jest.fn() },
}));

await import("../worker.js");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("worker handler", () => {
  it("calls parseFile → identify → upsertOne → saveAlbumArt on success", async () => {
    expect(capturedHandler).not.toBeNull();

    const parsed = { filePath: "/music/song.mp3", title: "Song", artist: "Artist", album: "Album", genreNames: ["rock"], aliases: [], albumAliases: [], artistAliases: [] } as any;
    const enriched = { ...parsed, musicbrainzRecordingId: "mbid-1", embeddedPicture: { data: Buffer.from("img"), format: "image/jpeg" } };

    mockParseFile.mockResolvedValue(parsed);
    mockIdentify.mockResolvedValue(enriched);
    mockUpsertOne.mockResolvedValue({ albumId: "album-1" });

    const result = await capturedHandler!({ data: { filePath: "/music/song.mp3" }, attemptsMade: 0 });

    expect(mockParseFile).toHaveBeenCalledWith("/music/song.mp3");
    expect(mockIdentify).toHaveBeenCalledWith("/music/song.mp3", parsed);
    expect(mockUpsertOne).toHaveBeenCalledWith(enriched);
    expect(mockSaveAlbumArt).toHaveBeenCalledWith("album-1", enriched.embeddedPicture);
    expect(result).toEqual({ success: true });
  });

  it("returns error when parseFile returns null", async () => {
    mockParseFile.mockResolvedValue(null);

    const result = await capturedHandler!({ data: { filePath: "/music/bad.mp3" }, attemptsMade: 0 });

    expect(mockIdentify).not.toHaveBeenCalled();
    expect(mockUpsertOne).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: "Parse failed" });
  });

  it("does not call saveAlbumArt when no embedded picture", async () => {
    const parsed = { filePath: "/music/song.mp3", title: "Song", artist: "Artist", album: "Album", genreNames: [], aliases: [], albumAliases: [], artistAliases: [] } as any;
    mockParseFile.mockResolvedValue(parsed);
    mockIdentify.mockResolvedValue(parsed);
    mockUpsertOne.mockResolvedValue({ albumId: "album-1" });

    await capturedHandler!({ data: { filePath: "/music/song.mp3" }, attemptsMade: 0 });

    expect(mockSaveAlbumArt).not.toHaveBeenCalled();
  });
});
