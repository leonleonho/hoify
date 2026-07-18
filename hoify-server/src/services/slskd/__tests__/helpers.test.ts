import { describe, it, expect } from "@jest/globals";
import {
  isAudioFile,
  formatRank,
  folderNameFromPath,
  fileQualityScore,
  compareFilesByQuality,
} from "../helpers.js";
import { groupByPeerAndFolder } from "../search.js";
import { mapTransferStatus, isTerminalStatus } from "../status.js";
import type { SlskdSearchResponse } from "../types.js";

describe("isAudioFile", () => {
  it("returns true for known audio extensions", () => {
    expect(isAudioFile("song.flac")).toBe(true);
    expect(isAudioFile("song.mp3")).toBe(true);
    expect(isAudioFile("song.m4a")).toBe(true);
  });

  it("returns false for non-audio", () => {
    expect(isAudioFile("song.txt")).toBe(false);
    expect(isAudioFile("cover.jpg")).toBe(false);
  });
});

describe("formatRank", () => {
  it("ranks flac above mp3", () => {
    expect(formatRank("a.flac")).toBeGreaterThan(formatRank("a.mp3"));
  });
});

describe("folderNameFromPath", () => {
  it("extracts soulseek folder path", () => {
    expect(folderNameFromPath("Artist\\Album\\01 Track.flac")).toBe(
      "Artist\\Album",
    );
  });

  it("returns . for root files", () => {
    expect(folderNameFromPath("track.mp3")).toBe(".");
  });

  it("normalizes forward slashes", () => {
    expect(folderNameFromPath("Artist/Album/track.flac")).toBe("Artist\\Album");
  });
});

describe("compareFilesByQuality", () => {
  it("prefers flac over mp3", () => {
    const files = [
      { filename: "song.mp3", bitRate: 320 },
      { filename: "song.flac", bitRate: 0 },
    ];
    files.sort(compareFilesByQuality);
    expect(files[0].filename).toBe("song.flac");
  });

  it("prefers higher bitrate within same format", () => {
    const a = { filename: "a.mp3", bitRate: 128 };
    const b = { filename: "b.mp3", bitRate: 320 };
    expect(compareFilesByQuality(a, b)).toBeGreaterThan(0);
  });

  it("penalizes locked files", () => {
    expect(
      fileQualityScore({ filename: "a.flac", isLocked: true }),
    ).toBeLessThan(fileQualityScore({ filename: "a.flac", isLocked: false }));
  });
});

describe("groupByPeerAndFolder", () => {
  const responses: SlskdSearchResponse[] = [
    {
      username: "slowPeer",
      hasFreeUploadSlot: false,
      uploadSpeed: 1000,
      queueLength: 20,
      files: [
        {
          filename: "Artist\\Album\\01 Song.mp3",
          size: 3_000_000,
          bitRate: 128,
        },
        { filename: "readme.txt", size: 100 },
      ],
    },
    {
      username: "fastPeer",
      hasFreeUploadSlot: true,
      uploadSpeed: 5_000_000,
      queueLength: 0,
      files: [
        {
          filename: "Artist\\Album FLAC\\01 Song.flac",
          size: 30_000_000,
          bitDepth: 16,
          sampleRate: 44100,
        },
        {
          filename: "Artist\\Album FLAC\\02 Song.flac",
          size: 28_000_000,
          bitDepth: 16,
          sampleRate: 44100,
        },
        {
          filename: "Artist\\Album\\01 Song.mp3",
          size: 5_000_000,
          bitRate: 320,
        },
      ],
    },
  ];

  it("groups by peer and folder, filters non-audio and locked, sorts by quality", () => {
    const peers = groupByPeerAndFolder([
      ...responses,
      {
        username: "lockedOnly",
        hasFreeUploadSlot: true,
        files: [
          {
            filename: "Secret\\locked.flac",
            size: 10_000_000,
            isLocked: true,
          },
        ],
      },
    ]);

    expect(peers).toHaveLength(2);
    expect(peers[0].peer).toBe("fastPeer");
    expect(peers[0].folders[0].name).toBe("Artist\\Album FLAC");
    expect(peers[0].folders[0].files[0].filename).toContain(".flac");
    expect(peers[1].peer).toBe("slowPeer");
    expect(peers.map((p) => p.peer)).not.toContain("lockedOnly");
    expect(
      peers.flatMap((p) => p.folders.flatMap((f) => f.files)).map((f) => f.filename),
    ).not.toContain("readme.txt");
  });
});

describe("mapTransferStatus", () => {
  it("maps common slskd states", () => {
    expect(mapTransferStatus("Queued")).toBe("queued");
    expect(mapTransferStatus("InProgress")).toBe("downloading");
    expect(mapTransferStatus("Completed, Succeeded")).toBe("completed");
    expect(mapTransferStatus("Completed, Errored")).toBe("failed");
    expect(mapTransferStatus("Cancelled")).toBe("cancelled");
  });

  it("identifies terminal statuses", () => {
    expect(isTerminalStatus("completed")).toBe(true);
    expect(isTerminalStatus("failed")).toBe(true);
    expect(isTerminalStatus("queued")).toBe(false);
    expect(isTerminalStatus("downloading")).toBe(false);
  });
});
