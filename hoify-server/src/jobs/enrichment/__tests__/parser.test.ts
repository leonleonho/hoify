import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { IAudioMetadata } from "music-metadata";

const mockParseAudio = jest.fn<(filePath: string) => Promise<IAudioMetadata>>();
const mockStat = jest.fn<() => Promise<{ size: number; mtimeMs: number }>>();

jest.unstable_mockModule("music-metadata", () => ({
  parseFile: mockParseAudio,
}));

jest.unstable_mockModule("node:fs/promises", () => ({
  stat: mockStat,
}));

const { parseFile } = await import("../parser.js");

function makeAudioMeta(
  overrides: Partial<IAudioMetadata["common"] & { duration?: number; codec?: string }> = {},
): IAudioMetadata {
  return {
    format: {
      container: "MPEG",
      codec: "MP3",
      duration: 240,
      ...overrides,
    } as IAudioMetadata["format"],
    common: {
      title: "Real Title",
      artist: "Real Artist",
      album: "Real Album",
      year: 2020,
      track: { no: 3, of: 10 },
      disk: { no: 1, of: 2 },
      genre: ["rock", "alternative"],
      picture: [],
      ...overrides,
    },
    native: {},
    quality: { warnings: [] },
  } as unknown as IAudioMetadata;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockStat.mockResolvedValue({ size: 5000, mtimeMs: 1000 });
});

describe("parseFile", () => {
  it("parses valid file with all metadata", async () => {
    mockParseAudio.mockResolvedValue(makeAudioMeta());

    const result = await parseFile("/music/song.mp3");

    expect(result).not.toBeNull();
    expect(result!.title).toBe("Real Title");
    expect(result!.artist).toBe("Real Artist");
    expect(result!.album).toBe("Real Album");
    expect(result!.year).toBe(2020);
    expect(result!.trackNumber).toBe(3);
    expect(result!.discNumber).toBe(1);
    expect(result!.duration).toBe(240);
    expect(result!.genreNames).toEqual(["rock", "alternative"]);
    expect(result!.fileFormat).toBe("MP3");
    expect(result!.fileSize).toBe(5000);
    expect(result!.fileMtime).toBe(1000);
    expect(result!.filePath).toBe("/music/song.mp3");
  });

  it("falls back to filename for title when missing", async () => {
    mockParseAudio.mockResolvedValue(makeAudioMeta({ title: undefined }));

    const result = await parseFile("/music/song.mp3");
    expect(result!.title).toBe("song");
  });

  it("falls back to Unknown Artist when artist missing", async () => {
    mockParseAudio.mockResolvedValue(makeAudioMeta({ artist: undefined }));

    const result = await parseFile("/music/song.mp3");
    expect(result!.artist).toBe("Unknown Artist");
  });

  it("falls back to Unknown Album when album missing", async () => {
    mockParseAudio.mockResolvedValue(makeAudioMeta({ album: undefined }));

    const result = await parseFile("/music/song.mp3");
    expect(result!.album).toBe("Unknown Album");
  });

  it("handles missing duration", async () => {
    mockParseAudio.mockResolvedValue(makeAudioMeta({ duration: undefined }));

    const result = await parseFile("/music/song.mp3");
    expect(result!.duration).toBeNull();
  });

  it("handles missing year", async () => {
    mockParseAudio.mockResolvedValue(makeAudioMeta({ year: undefined }));

    const result = await parseFile("/music/song.mp3");
    expect(result!.year).toBeNull();
  });

  it("handles NaN year", async () => {
    mockParseAudio.mockResolvedValue(makeAudioMeta({ year: NaN }));

    const result = await parseFile("/music/song.mp3");
    expect(result!.year).toBeNull();
  });

  it("extracts front cover from embedded pictures", async () => {
    const frontCover = {
      data: new Uint8Array([1, 2, 3]),
      format: "image/jpeg",
      type: "Front Cover",
    };
    const backCover = {
      data: new Uint8Array([4, 5, 6]),
      format: "image/jpeg",
      type: "Back Cover",
    };
    mockParseAudio.mockResolvedValue(
      makeAudioMeta({ picture: [backCover, frontCover] }),
    );

    const result = await parseFile("/music/song.mp3");
    expect(result!.embeddedPicture).toBeDefined();
    expect(result!.embeddedPicture!.format).toBe("image/jpeg");
    expect(Buffer.from(result!.embeddedPicture!.data)).toEqual(
      Buffer.from([1, 2, 3]),
    );
  });

  it("falls back to first picture when no front cover", async () => {
    const pic = {
      data: new Uint8Array([7, 8, 9]),
      format: "image/png",
      type: "Other",
    };
    mockParseAudio.mockResolvedValue(makeAudioMeta({ picture: [pic] }));

    const result = await parseFile("/music/song.mp3");
    expect(result!.embeddedPicture).toBeDefined();
    expect(result!.embeddedPicture!.format).toBe("image/png");
  });

  it("no embedded picture when none present", async () => {
    mockParseAudio.mockResolvedValue(makeAudioMeta({ picture: [] }));

    const result = await parseFile("/music/song.mp3");
    expect(result!.embeddedPicture).toBeUndefined();
  });

  it("falls back to file extension for format when codec missing", async () => {
    mockParseAudio.mockResolvedValue(makeAudioMeta({ codec: undefined }));

    const result = await parseFile("/music/song.flac");
    expect(result!.fileFormat).toBe("flac");
  });

  it("returns null on parse error", async () => {
    mockParseAudio.mockRejectedValue(new Error("Corrupt file"));

    const result = await parseFile("/music/song.mp3");
    expect(result).toBeNull();
  });
});
