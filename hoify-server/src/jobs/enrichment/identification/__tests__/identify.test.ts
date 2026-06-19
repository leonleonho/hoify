import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockLogger = { debug: jest.fn(), warn: jest.fn(), info: jest.fn() };

const mockFpcalc = jest.fn();
const mockAcoustid = jest.fn();
const mockMusicbrainz = jest.fn();
const mockCoverArt = jest.fn();

jest.unstable_mockModule("../fpcalc.js", () => ({
  getFingerprint: mockFpcalc,
}));

jest.unstable_mockModule("../acoustid.js", () => ({
  lookupAcoustid: mockAcoustid,
}));

jest.unstable_mockModule("../musicbrainz.js", () => ({
  lookupMusicbrainz: mockMusicbrainz,
  lookupCoverArt: mockCoverArt,
  lookupReleaseAliases: jest.fn<() => Promise<string[]>>().mockResolvedValue([]),
}));

jest.unstable_mockModule("../../../../util/logger", () => ({
  logger: mockLogger,
}));

const { identify, detectPlaceholders, needsFingerprint, mergeOverrides } = await import("../identify.js");
import type { ParsedTrack } from "../../types/types.js";
import type { MusicbrainzRecording } from "../types.js";

function makeTrack(overrides: Partial<ParsedTrack> = {}): ParsedTrack {
  return {
    filePath: "/music/song.mp3",
    fileFormat: "mp3",
    fileSize: 5000,
    fileMtime: 1000,
    title: "Real Title",
    artist: "Real Artist",
    album: "Real Album",
    year: 2020,
    trackNumber: 1,
    discNumber: 1,
    duration: 240,
    genreNames: ["rock"],
    aliases: [],
    albumAliases: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("identify", () => {
  it("skips fingerprinting when all metadata + genres present", async () => {
    const t = makeTrack();
    const result = await identify("/music/song.mp3", t);

    expect(mockFpcalc).not.toHaveBeenCalled();
    expect(mockAcoustid).not.toHaveBeenCalled();
    expect(mockMusicbrainz).not.toHaveBeenCalled();
    expect(result).toBe(t);
  });

  it("skips fingerprinting when only genres missing (no placeholder fields)", async () => {
    const t = makeTrack({ genreNames: [] });
    const result = await identify("/music/song.mp3", t);

    expect(mockFpcalc).not.toHaveBeenCalled();
    expect(mockAcoustid).not.toHaveBeenCalled();
    expect(mockMusicbrainz).not.toHaveBeenCalled();
    expect(result).toEqual(t);
  });

  it("runs full fingerprint chain when title is placeholder", async () => {
    const t = makeTrack({ title: "song", genreNames: [] });
    mockFpcalc.mockResolvedValue({ fingerprint: "ABCDEF", duration: 240 });
    mockAcoustid.mockResolvedValue({ recordingMbid: "mb-rec-1", score: 0.9 });
    mockMusicbrainz.mockResolvedValue({
      title: "Real Title",
      artist: "Real Artist",
      album: "Real Album",
      releaseYear: 1999,
      genres: ["alternative"],
      artistMbid: "mb-artist-1",
      albumMbid: "mb-album-1",
    });

    const result = await identify("/music/song.mp3", t);

    expect(mockFpcalc).toHaveBeenCalledTimes(1);
    expect(mockAcoustid).toHaveBeenCalledWith("ABCDEF", 240);
    expect(mockMusicbrainz).toHaveBeenCalledWith("mb-rec-1", false);
    expect(result.title).toBe("Real Title");
    expect(result.genreNames).toEqual(["alternative"]);
    expect(result.acoustidFingerprint).toBe("ABCDEF");
    expect(result.musicbrainzRecordingId).toBe("mb-rec-1");
    expect(result.artist).toBe("Real Artist");
  });

  it("falls back gracefully when all external lookups fail", async () => {
    const t = makeTrack({ title: "song", artist: "Unknown Artist" });
    mockFpcalc.mockResolvedValue(null);

    const result = await identify("/music/song.mp3", t);

    expect(result.title).toBe("song");
    expect(result.artist).toBe("Unknown Artist");
  });

  it("fetches cover art when no embedded picture but MB album ID known", async () => {
    const t = makeTrack({ title: "song", embeddedPicture: undefined });
    mockFpcalc.mockResolvedValue({ fingerprint: "FP", duration: 240 });
    mockAcoustid.mockResolvedValue({ recordingMbid: "mb-rec-1", score: 1.0 });
    mockMusicbrainz.mockResolvedValue({
      title: "Real Title",
      artist: "Real Artist",
      album: "Real Album",
      releaseYear: 1999,
      genres: [],
      artistMbid: "mb-artist-1",
      albumMbid: "mb-album-1",
    });
    mockCoverArt.mockResolvedValue({
      data: Buffer.from("cover"),
      format: "image/jpeg",
    });

    const result = await identify("/music/song.mp3", t);

    expect(mockCoverArt).toHaveBeenCalledWith("mb-album-1");
    expect(result.embeddedPicture).toEqual({
      data: Buffer.from("cover"),
      format: "image/jpeg",
    });
  });

  it("does NOT fetch cover art when embedded picture already present", async () => {
    const t = makeTrack({
      title: "song",
      embeddedPicture: { data: Buffer.from("img"), format: "image/jpeg" },
    });
    mockFpcalc.mockResolvedValue({ fingerprint: "FP", duration: 240 });
    mockAcoustid.mockResolvedValue({ recordingMbid: "mb-rec-1", score: 1.0 });
    mockMusicbrainz.mockResolvedValue({
      title: "Real Title",
      artist: "Real Artist",
      album: "Real Album",
      releaseYear: 1999,
      genres: [],
      artistMbid: "mb-artist-1",
      albumMbid: "mb-album-1",
    });

    const result = await identify("/music/song.mp3", t);

    expect(mockCoverArt).not.toHaveBeenCalled();
    expect(result.embeddedPicture).toBeDefined();
  });

  it("does NOT fetch cover art when no MB album ID", async () => {
    const t = makeTrack({ title: "song", embeddedPicture: undefined });
    mockFpcalc.mockResolvedValue({ fingerprint: "FP", duration: 240 });
    mockAcoustid.mockResolvedValue({ recordingMbid: "mb-rec-1", score: 1.0 });
    mockMusicbrainz.mockResolvedValue({
      title: "Real Title",
      artist: "Real Artist",
      album: null,
      releaseYear: null,
      genres: [],
      albumMbid: undefined,
    });

    const result = await identify("/music/song.mp3", t);

    expect(mockCoverArt).not.toHaveBeenCalled();
    expect(result.embeddedPicture).toBeUndefined();
  });

  it("catches error and returns original track unchanged", async () => {
    const t = makeTrack({ title: "song" });
    mockFpcalc.mockRejectedValue(new Error("Unexpected crash"));

    const result = await identify("/music/song.mp3", t);

    expect(result).toBe(t);
  });
});

describe("detectPlaceholders", () => {
  it("detects title as placeholder when it matches filename", () => {
    const t = makeTrack({ title: "song" });
    const p = detectPlaceholders(t, "/music/song.mp3");
    expect(p.titleIsPlaceholder).toBe(true);
    expect(p.artistIsPlaceholder).toBe(false);
    expect(p.albumIsPlaceholder).toBe(false);
    expect(p.genresMissing).toBe(false);
  });

  it("detects artist placeholder", () => {
    const t = makeTrack({ artist: "Unknown Artist" });
    const p = detectPlaceholders(t, "/music/song.mp3");
    expect(p.artistIsPlaceholder).toBe(true);
  });

  it("detects album placeholder", () => {
    const t = makeTrack({ album: "Unknown Album" });
    const p = detectPlaceholders(t, "/music/song.mp3");
    expect(p.albumIsPlaceholder).toBe(true);
  });

  it("detects missing genres", () => {
    const t = makeTrack({ genreNames: [] });
    const p = detectPlaceholders(t, "/music/song.mp3");
    expect(p.genresMissing).toBe(true);
  });

  it("all real metadata — no placeholders", () => {
    const t = makeTrack();
    const p = detectPlaceholders(t, "/music/song.mp3");
    expect(p.titleIsPlaceholder).toBe(false);
    expect(p.artistIsPlaceholder).toBe(false);
    expect(p.albumIsPlaceholder).toBe(false);
    expect(p.genresMissing).toBe(false);
  });
});

describe("needsFingerprint", () => {
  it("returns true when title is placeholder", () => {
    expect(needsFingerprint({ titleIsPlaceholder: true, artistIsPlaceholder: false, albumIsPlaceholder: false, genresMissing: false })).toBe(true);
  });

  it("returns true when artist is placeholder", () => {
    expect(needsFingerprint({ titleIsPlaceholder: false, artistIsPlaceholder: true, albumIsPlaceholder: false, genresMissing: false })).toBe(true);
  });

  it("returns true when album is placeholder", () => {
    expect(needsFingerprint({ titleIsPlaceholder: false, artistIsPlaceholder: false, albumIsPlaceholder: true, genresMissing: false })).toBe(true);
  });

  it("returns false when all metadata present", () => {
    expect(needsFingerprint({ titleIsPlaceholder: false, artistIsPlaceholder: false, albumIsPlaceholder: false, genresMissing: false })).toBe(false);
  });

  it("returns false when only genres missing", () => {
    expect(needsFingerprint({ titleIsPlaceholder: false, artistIsPlaceholder: false, albumIsPlaceholder: false, genresMissing: true })).toBe(false);
  });
});

describe("mergeOverrides", () => {
  const mbData: MusicbrainzRecording = {
    title: "Overridden Title",
    artist: "Overridden Artist",
    album: "Overridden Album",
    releaseYear: 1999,
    genres: ["alternative"],
    artistMbid: "mb-artist-1",
    albumMbid: "mb-album-1",
  };

  it("overrides placeholder fields only", () => {
    const t = makeTrack({
      title: "song",
      artist: "Unknown Artist",
      album: "Unknown Album",
    });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, mbData, p);
    expect(r.title).toBe("Overridden Title");
    expect(r.artist).toBe("Overridden Artist");
    expect(r.album).toBe("Overridden Album");
  });

  it("does NOT override real metadata with MB data", () => {
    const t = makeTrack({ title: "Real Title", artist: "Real Artist", album: "Real Album" });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, mbData, p);
    expect(r.title).toBe("Real Title");
    expect(r.artist).toBe("Real Artist");
    expect(r.album).toBe("Real Album");
  });

  it("sets year only when track year is null", () => {
    const t = makeTrack({ year: null });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, mbData, p);
    expect(r.year).toBe(1999);
  });

  it("does NOT override year when track already has year", () => {
    const t = makeTrack({ year: 2005 });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, mbData, p);
    expect(r.year).toBe(2005);
  });

  it("sets genres only when placeholders missing genres", () => {
    const t = makeTrack({ genreNames: [], title: "song" });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, mbData, p);
    expect(r.genreNames).toEqual(["alternative"]);
  });

  it("preserves existing genres when genres are present", () => {
    const t = makeTrack({ genreNames: ["rock"] });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, mbData, p);
    expect(r.genreNames).toEqual(["rock"]);
  });

  it("sets MB IDs when available", () => {
    const t = makeTrack({ title: "song" });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, mbData, p);
    expect(r.musicbrainzArtistId).toBe("mb-artist-1");
    expect(r.musicbrainzAlbumId).toBe("mb-album-1");
  });

  it("does not set MB IDs when mbData has none", () => {
    const t = makeTrack({ title: "song" });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, { ...mbData, artistMbid: undefined, albumMbid: undefined }, p);
    expect(r.musicbrainzArtistId).toBeUndefined();
    expect(r.musicbrainzAlbumId).toBeUndefined();
  });

  it("preserves embedded picture when present", () => {
    const picData = { data: Buffer.from("img"), format: "image/jpeg" };
    const t = makeTrack({ title: "song", embeddedPicture: picData });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, mbData, p);
    expect(r.embeddedPicture).toBe(picData);
  });

  it("null mbData — no-op, returns track unchanged", () => {
    const t = makeTrack({ title: "song" });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, null, p);
    expect(r.title).toBe("song");
    expect(r.musicbrainzArtistId).toBeUndefined();
  });

  it("does not override album when mbData album is null", () => {
    const t = makeTrack({ title: "song", album: "Unknown Album" });
    const p = detectPlaceholders(t, "/music/song.mp3");
    const r = mergeOverrides(t, { ...mbData, album: null }, p);
    expect(r.album).toBe("Unknown Album");
  });
});
