import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

const mockLogger = { debug: jest.fn(), warn: jest.fn(), info: jest.fn() };

jest.unstable_mockModule("../../../../util/logger", () => ({
  logger: mockLogger,
}));

const { lookupAcoustid, __testResetRateLimiter } = await import("../acoustid.js");

const mockFetch = jest.fn<typeof fetch>();

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  global.fetch = mockFetch as unknown as typeof fetch;
  delete process.env.ACOUSTID_API_KEY;
  __testResetRateLimiter();
});

afterEach(() => {
  delete process.env.ACOUSTID_API_KEY;
});

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function errorResponse(status: number, body: string): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("lookupAcoustid", () => {
  it("returns null when API key not set", async () => {
    const result = await lookupAcoustid("fp", 240);
    expect(result).toBeNull();
  });

  it("returns top-scoring match on success", async () => {
    process.env.ACOUSTID_API_KEY = "test-key";
    mockFetch.mockResolvedValue(
      okResponse({
        status: "ok",
        results: [
          { score: 0.5, recordings: [{ id: "mbid-2" }] },
          { score: 0.9, recordings: [{ id: "mbid-1" }] },
        ],
      }),
    );

    const result = await lookupAcoustid("fp", 240);
    expect(result).toEqual({ recordingMbid: "mbid-1", score: 0.9 });
  });

  it("returns null when status is not ok", async () => {
    process.env.ACOUSTID_API_KEY = "test-key";
    mockFetch.mockResolvedValue(
      okResponse({ status: "error", results: [] }),
    );

    const result = await lookupAcoustid("fp", 240);
    expect(result).toBeNull();
  });

  it("returns null when no results", async () => {
    process.env.ACOUSTID_API_KEY = "test-key";
    mockFetch.mockResolvedValue(
      okResponse({ status: "ok", results: [] }),
    );

    const result = await lookupAcoustid("fp", 240);
    expect(result).toBeNull();
  });

  it("returns null when result has no recordings", async () => {
    process.env.ACOUSTID_API_KEY = "test-key";
    mockFetch.mockResolvedValue(
      okResponse({
        status: "ok",
        results: [{ score: 1.0, recordings: [] }],
      }),
    );

    const result = await lookupAcoustid("fp", 240);
    expect(result).toBeNull();
  });

  it("returns null on API error status", async () => {
    process.env.ACOUSTID_API_KEY = "test-key";
    mockFetch.mockResolvedValue(errorResponse(500, "Internal Error"));

    const result = await lookupAcoustid("fp", 240);
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    process.env.ACOUSTID_API_KEY = "test-key";
    mockFetch.mockRejectedValue(new Error("Network failure"));

    const result = await lookupAcoustid("fp", 240);
    expect(result).toBeNull();
  });
});
