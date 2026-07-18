import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

const mockFetch = jest.fn<typeof fetch>();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
  delete process.env.SLSKD_API_KEY;
  process.env.SLSKD_URL = "http://slskd.test";
  process.env.SLSKD_ENABLED = "true";
});

afterEach(() => {
  delete process.env.SLSKD_API_KEY;
  delete process.env.SLSKD_URL;
  delete process.env.SLSKD_ENABLED;
});

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () =>
      Promise.resolve(body === undefined ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

function errorResponse(status: number, body: string): Response {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("slskd client", () => {
  it("isSlskdEnabled is true only when SLSKD_ENABLED=true", async () => {
    const { isSlskdEnabled } = await import("../client.js");
    process.env.SLSKD_ENABLED = "true";
    expect(isSlskdEnabled()).toBe(true);
    process.env.SLSKD_ENABLED = "false";
    expect(isSlskdEnabled()).toBe(false);
  });

  it("apiFetch posts JSON and returns parsed body", async () => {
    const { apiFetch } = await import("../client.js");
    mockFetch.mockResolvedValue(okResponse({ id: "abc" }));

    const result = await apiFetch<{ id: string }>("/api/v0/searches", {
      method: "POST",
      body: JSON.stringify({ searchText: "test" }),
    });

    expect(result).toEqual({ id: "abc" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://slskd.test/api/v0/searches",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("apiFetch sends X-API-Key when configured", async () => {
    process.env.SLSKD_API_KEY = "secret";
    const { apiFetch } = await import("../client.js");
    mockFetch.mockResolvedValue(okResponse({ ok: true }));

    await apiFetch("/api/v0/searches");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-API-Key": "secret" }),
      }),
    );
  });

  it("apiFetch throws on non-ok response", async () => {
    const { apiFetch } = await import("../client.js");
    mockFetch.mockResolvedValue(errorResponse(503, "down"));

    await expect(apiFetch("/api/v0/searches")).rejects.toThrow(
      /slskd API 503/,
    );
  });

  it("apiFetch returns undefined for empty body", async () => {
    const { apiFetch } = await import("../client.js");
    mockFetch.mockResolvedValue(okResponse(undefined));

    const result = await apiFetch("/api/v0/noop");
    expect(result).toBeUndefined();
  });
});
