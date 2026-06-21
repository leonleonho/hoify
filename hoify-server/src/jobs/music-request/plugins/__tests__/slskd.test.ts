import { describe, it, expect } from "@jest/globals";
import { isAudioFile, stripExt, nameMatches, formatRank } from "../slskd.js";

describe("isAudioFile", () => {
  it("returns true for known audio extensions", () => {
    expect(isAudioFile("song.flac")).toBe(true);
    expect(isAudioFile("song.mp3")).toBe(true);
    expect(isAudioFile("song.m4a")).toBe(true);
    expect(isAudioFile("song.opus")).toBe(true);
    expect(isAudioFile("song.ogg")).toBe(true);
  });

  it("returns false for non-audio extensions", () => {
    expect(isAudioFile("song.txt")).toBe(false);
    expect(isAudioFile("song.jpg")).toBe(false);
    expect(isAudioFile("song")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isAudioFile("Song.FLAC")).toBe(true);
    expect(isAudioFile("Song.MP3")).toBe(true);
  });
});

describe("stripExt", () => {
  it("strips known audio extension", () => {
    expect(stripExt("song.flac")).toBe("song");
    expect(stripExt("my song.mp3")).toBe("my song");
  });

  it("returns original if no known extension", () => {
    expect(stripExt("song.txt")).toBe("song.txt");
  });

  it("strips only extension, not middle dots", () => {
    expect(stripExt("song.remix.flac")).toBe("song.remix");
  });
});

describe("nameMatches", () => {
  it("matches exact song name", () => {
    expect(nameMatches("Song.mp3", "Song")).toBe(true);
  });

  it("matches bonus track (not a variant)", () => {
    expect(nameMatches("Song (Bonus Track).flac", "Song")).toBe(true);
  });

  it("handles punctuation and spacing", () => {
    expect(nameMatches("Song/Artist.mp3", "Song Artist")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(nameMatches("SONG.FLAC", "song")).toBe(true);
  });

  it("rejects variant when user wants original — remix", () => {
    expect(nameMatches("Song (Remix).flac", "Song")).toBe(false);
  });

  it("rejects variant when user wants original — instrumental", () => {
    expect(nameMatches("Song (Instrumental).flac", "Song")).toBe(false);
  });

  it("rejects variant when user wants original — cover", () => {
    expect(nameMatches("Song (Cover).mp3", "Song")).toBe(false);
  });

  it("rejects variant when user wants original — live", () => {
    expect(nameMatches("Song (Live).mp3", "Song")).toBe(false);
  });

  it("rejects variant when user wants original — acoustic", () => {
    expect(nameMatches("Song (Acoustic).mp3", "Song")).toBe(false);
  });

  it("rejects variant when user wants original — edit", () => {
    expect(nameMatches("Song (Edit).mp3", "Song")).toBe(false);
  });

  it("rejects variant when user wants original — extended", () => {
    expect(nameMatches("Song (Extended).flac", "Song")).toBe(false);
  });

  it("accepts variant when user explicitly asks for it", () => {
    expect(nameMatches("Song (Extended).flac", "Song (Extended)")).toBe(true);
  });

  it("accepts remix when user asks for remix", () => {
    expect(nameMatches("Song (Remix).flac", "Song Remix")).toBe(true);
  });

  it("rejects remix mismatch — user requests remix but file is live", () => {
    expect(nameMatches("Song (Live).flac", "Song Remix")).toBe(false);
  });

  it("rejects remix mismatch — user requests remix but file is instrumental", () => {
    expect(nameMatches("Song Instrumental.flac", "Song (Remix)")).toBe(false);
  });

  it("requires shared variant — user requests acoustic, only live file available", () => {
    expect(nameMatches("Song (Live).mp3", "Song (Acoustic)")).toBe(false);
  });

  it("accepts multiple variants when file has matching one — user requests remix, file has edit and remix", () => {
    expect(nameMatches("Song (Edit Remix).flac", "Song (Remix)")).toBe(true);
  });

  it("rejects different song entirely", () => {
    expect(nameMatches("OtherSong.mp3", "TotallyDifferent")).toBe(false);
  });

  it("rejects single-char tokens (too short)", () => {
    expect(nameMatches("A B C.flac", "A")).toBe(false);
  });
});

describe("formatRank", () => {
  it("ranks FLAC highest", () => {
    expect(formatRank("song.flac")).toBe(3);
  });

  it("ranks MP3 second", () => {
    expect(formatRank("song.mp3")).toBe(2);
  });

  it("ranks opus, ogg, m4a as 1", () => {
    expect(formatRank("song.opus")).toBe(1);
    expect(formatRank("song.ogg")).toBe(1);
    expect(formatRank("song.m4a")).toBe(1);
  });

  it("returns 0 for unknown formats", () => {
    expect(formatRank("song.txt")).toBe(0);
  });
});

describe("SlskdPlugin — download", () => {
  it("rejects request without songName", async () => {
    const { SlskdPlugin } = await import("../slskd.js");
    const plugin = new SlskdPlugin(async () => {});

    const result = await plugin.download({
      requestId: "1",
      artistName: "Artist",
      albumName: "Album",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("slskd requires songName");
  });
});
