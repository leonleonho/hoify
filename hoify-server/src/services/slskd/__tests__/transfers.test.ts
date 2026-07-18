import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

const mockFetch = jest.fn<typeof fetch>();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
  process.env.SLSKD_URL = "http://slskd.test";
});

afterEach(() => {
  delete process.env.SLSKD_URL;
});

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe("slskd transfers", () => {
  it("enqueueDownloads posts files to peer endpoint", async () => {
    const { enqueueDownloads } = await import("../transfers.js");
    mockFetch.mockResolvedValue(
      okResponse({
        enqueued: [
          {
            id: 42,
            username: "peer1",
            filename: "a.flac",
            size: 1000,
            state: "Queued",
          },
        ],
        failed: [],
      }),
    );

    const result = await enqueueDownloads("peer1", [
      { filename: "a.flac", size: 1000 },
    ]);

    expect(result.enqueued).toHaveLength(1);
    expect(result.enqueued[0].id).toBe(42);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://slskd.test/api/v0/transfers/downloads/peer1",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify([{ filename: "a.flac", size: 1000 }]),
      }),
    );
  });

  it("enqueueDownloads URL-encodes peer names", async () => {
    const { enqueueDownloads } = await import("../transfers.js");
    mockFetch.mockResolvedValue(okResponse({ enqueued: [], failed: [] }));

    await enqueueDownloads("user name", [{ filename: "a.mp3", size: 1 }]);

    expect(mockFetch.mock.calls[0][0]).toBe(
      "http://slskd.test/api/v0/transfers/downloads/user%20name",
    );
  });

  it("getTransfer fetches a single transfer", async () => {
    const { getTransfer } = await import("../transfers.js");
    mockFetch.mockResolvedValue(
      okResponse({
        id: 7,
        state: "InProgress",
        percentComplete: 40,
        bytesTransferred: 400,
      }),
    );

    const transfer = await getTransfer("peer1", 7);
    expect(transfer.state).toBe("InProgress");
    expect(transfer.percentComplete).toBe(40);
    expect(mockFetch.mock.calls[0][0]).toBe(
      "http://slskd.test/api/v0/transfers/downloads/peer1/7",
    );
  });
});
