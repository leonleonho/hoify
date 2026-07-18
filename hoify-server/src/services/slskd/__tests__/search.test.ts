import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { SEARCH_TIMEOUT_MS, SLSKD_SEARCH_TIMEOUT_MS } from "../helpers.js";

const mockFetch = jest.fn<typeof fetch>();

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  global.fetch = mockFetch as unknown as typeof fetch;
  process.env.SLSKD_URL = "http://slskd.test";
});

afterEach(() => {
  jest.useRealTimers();
  delete process.env.SLSKD_URL;
});

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe("slskd search API", () => {
  it("startSearch posts with long slskd timeout and returns id", async () => {
    const { startSearch, clearSearchStart } = await import("../search.js");
    mockFetch.mockResolvedValue(okResponse({ id: "search-1" }));

    const result = await startSearch("Daft Punk");
    expect(result).toEqual({ id: "search-1" });

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      searchText: "Daft Punk",
      searchTimeout: SLSKD_SEARCH_TIMEOUT_MS,
      fileLimit: 200,
      filterResponses: true,
    });
    expect(SEARCH_TIMEOUT_MS).toBe(10_000);
    expect(SLSKD_SEARCH_TIMEOUT_MS).toBeGreaterThan(SEARCH_TIMEOUT_MS);

    clearSearchStart("search-1");
  });

  it("getSearchStatus and getSearchResponses hit the right endpoints", async () => {
    const { getSearchStatus, getSearchResponses } = await import("../search.js");

    mockFetch
      .mockResolvedValueOnce(
        okResponse({ id: "s1", isComplete: false, searchText: "q" }),
      )
      .mockResolvedValueOnce(
        okResponse([{ username: "peer", files: [] }]),
      );

    await expect(getSearchStatus("s1")).resolves.toMatchObject({
      id: "s1",
      isComplete: false,
    });
    expect(mockFetch.mock.calls[0][0]).toBe(
      "http://slskd.test/api/v0/searches/s1",
    );

    await expect(getSearchResponses("s1")).resolves.toEqual([
      { username: "peer", files: [] },
    ]);
    expect(mockFetch.mock.calls[1][0]).toContain(
      "/api/v0/searches/s1/responses",
    );
  });

  it("cancelSearch uses PUT", async () => {
    const { cancelSearch } = await import("../search.js");
    mockFetch.mockResolvedValue(okResponse(undefined));

    await cancelSearch("s1");
    expect(mockFetch.mock.calls[0][0]).toBe(
      "http://slskd.test/api/v0/searches/s1",
    );
    expect((mockFetch.mock.calls[0][1] as RequestInit).method).toBe("PUT");
  });

  it("waitForSearchResponses returns once responses appear", async () => {
    const { waitForSearchResponses } = await import("../search.js");
    mockFetch
      .mockResolvedValueOnce(okResponse([]))
      .mockResolvedValueOnce(
        okResponse({ id: "s1", isComplete: false }),
      )
      .mockResolvedValueOnce(
        okResponse([{ username: "peer", files: [{ filename: "a.flac", size: 1 }] }]),
      );

    await expect(
      waitForSearchResponses("s1", { maxWaitMs: 1000, intervalMs: 10 }),
    ).resolves.toEqual([
      { username: "peer", files: [{ filename: "a.flac", size: 1 }] },
    ]);
  });

  it("getSearchResponses returns [] when API returns nullish", async () => {
    const { getSearchResponses } = await import("../search.js");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    } as unknown as Response);

    await expect(getSearchResponses("s1")).resolves.toEqual([]);
  });

  it("isSearchTimedOut uses local start time from startSearch", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const { startSearch, isSearchTimedOut, clearSearchStart } = await import(
      "../search.js"
    );
    mockFetch.mockResolvedValue(okResponse({ id: "timed" }));
    await startSearch("query");

    expect(isSearchTimedOut("timed", null)).toBe(false);

    jest.setSystemTime(new Date("2026-01-01T00:00:09Z"));
    expect(isSearchTimedOut("timed", null)).toBe(false);

    jest.setSystemTime(new Date("2026-01-01T00:00:10Z"));
    expect(isSearchTimedOut("timed", null)).toBe(true);

    clearSearchStart("timed");
  });

  it("isSearchTimedOut falls back to provider startedAt", async () => {
    const { isSearchTimedOut } = await import("../search.js");
    const started = new Date(Date.now() - SEARCH_TIMEOUT_MS - 1000).toISOString();
    expect(isSearchTimedOut("unknown-id", started)).toBe(true);
    expect(
      isSearchTimedOut("unknown-id", new Date().toISOString()),
    ).toBe(false);
  });

  it("hasEnoughSearchPeers is true only above the peer limit", async () => {
    const { hasEnoughSearchPeers } = await import("../search.js");
    expect(hasEnoughSearchPeers(15)).toBe(false);
    expect(hasEnoughSearchPeers(16)).toBe(true);
    expect(hasEnoughSearchPeers(null)).toBe(false);
  });

  it("shouldFinalizeSearch is true on timeout or enough peers", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const {
      startSearch,
      shouldFinalizeSearch,
      clearSearchStart,
    } = await import("../search.js");
    mockFetch.mockResolvedValue(okResponse({ id: "ready" }));
    await startSearch("query");

    expect(shouldFinalizeSearch("ready", null, 3)).toBe(false);
    expect(shouldFinalizeSearch("ready", null, 16)).toBe(true);

    jest.setSystemTime(new Date("2026-01-01T00:00:10Z"));
    expect(shouldFinalizeSearch("ready", null, 3)).toBe(true);

    clearSearchStart("ready");
  });
});
