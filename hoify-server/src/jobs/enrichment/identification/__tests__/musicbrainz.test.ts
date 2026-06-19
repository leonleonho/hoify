import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockLogger = { debug: jest.fn(), warn: jest.fn(), info: jest.fn() };

const mockLookup = jest.fn<() => Promise<unknown>>();
const mockMbClient = { lookup: mockLookup };

jest.unstable_mockModule("musicbrainz-api", () => ({
  MusicBrainzApi: jest.fn(() => mockMbClient),
}));

jest.unstable_mockModule("../../../../util/logger", () => ({
  logger: mockLogger,
}));

const { lookupMusicbrainz, lookupCoverArt } = await import("../musicbrainz.js");

const mockFetch = jest.fn<typeof fetch>();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
});

function mbRecordingResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Overridden Title",
    "artist-credit": [{ artist: { id: "mb-artist-1", name: "Real Artist" } }],
    releases: [{ id: "mb-album-1", title: "Real Album", date: "1999-05-12" }],
    genres: [{ name: "Rock" }],
    tags: [{ name: "alternative" }],
    aliases: [{ name: "Real Alias" }],
    ...overrides,
  };
}

describe("lookupMusicbrainz", () => {
  it("returns structured recording data on success", async () => {
    mockLookup.mockResolvedValue(mbRecordingResponse());

    const result = await lookupMusicbrainz("some-mbid");
    expect(result).toEqual({
      title: "Overridden Title",
      artist: "Real Artist",
      album: "Real Album",
      releaseYear: 1999,
      genres: expect.arrayContaining(["rock", "alternative"]),
      artistMbid: "mb-artist-1",
      albumMbid: "mb-album-1",
      aliases: expect.arrayContaining(["Real Alias"]),
    });
  });

  it("handles missing artist-credit gracefully", async () => {
    mockLookup.mockResolvedValue(mbRecordingResponse({ "artist-credit": [] }));

    const result = await lookupMusicbrainz("some-mbid");
    expect(result!.artist).toBe("Unknown Artist");
  });

  it("handles missing releases gracefully", async () => {
    mockLookup.mockResolvedValue(mbRecordingResponse({ releases: [] }));

    const result = await lookupMusicbrainz("some-mbid");
    expect(result!.album).toBeNull();
    expect(result!.releaseYear).toBeNull();
  });

  it("handles malformed release date", async () => {
    mockLookup.mockResolvedValue(
      mbRecordingResponse({
        releases: [{ id: "mb-album-1", title: "Album", date: "bad-date" }],
      }),
    );

    const result = await lookupMusicbrainz("some-mbid");
    expect(result!.releaseYear).toBeNull();
  });

  it("merges tags into genres", async () => {
    mockLookup.mockResolvedValue(
      mbRecordingResponse({ genres: [], tags: [{ name: "Punk" }, { name: "Indie" }] }),
    );

    const result = await lookupMusicbrainz("some-mbid");
    expect(result!.genres).toContain("punk");
    expect(result!.genres).toContain("indie");
  });

  it("returns null on API error", async () => {
    mockLookup.mockRejectedValue(new Error("MusicBrainz unavailable"));

    const result = await lookupMusicbrainz("some-mbid");
    expect(result).toBeNull();
  });
});

function coverArtResponse(status: number, body?: Buffer | string): Response {
  const headers = new Map<string, string>();
  if (status === 200) headers.set("content-type", "image/jpeg");
  return {
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: () =>
      status === 200
        ? Promise.resolve(body as Buffer)
        : Promise.reject(new Error("no body")),
    headers: {
      get: (name: string) => headers.get(name) ?? null,
    },
  } as unknown as Response;
}

describe("lookupCoverArt", () => {
  it("returns ArtData on successful fetch", async () => {
    const imgBuffer = Buffer.from("fake-image-data");
    mockFetch.mockResolvedValue(coverArtResponse(200, imgBuffer));

    const result = await lookupCoverArt("release-mbid");
    expect(result).not.toBeNull();
    expect(result!.format).toBe("image/jpeg");
    expect(result!.data).toEqual(imgBuffer);
  });

  it("returns null on 404", async () => {
    mockFetch.mockResolvedValue(coverArtResponse(404));

    const result = await lookupCoverArt("release-mbid");
    expect(result).toBeNull();
  });

  it("returns null on server error", async () => {
    mockFetch.mockResolvedValue(coverArtResponse(500));

    const result = await lookupCoverArt("release-mbid");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));

    const result = await lookupCoverArt("release-mbid");
    expect(result).toBeNull();
  });
});
