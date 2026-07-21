import { describe, it, expect, jest } from "@jest/globals";

jest.unstable_mockModule("../logger.js", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const { createCoalesceQueue } = await import("../coalesceQueue.js");

describe("createCoalesceQueue", () => {
  it("runs batch once on success", async () => {
    const run = jest.fn<(batch: string[]) => Promise<void>>();
    run.mockResolvedValue(undefined);

    const queue = createCoalesceQueue({ label: "test", run, retryDelayMs: 10 });
    await queue.schedule(["/a", "/b"]);

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(["/a", "/b"]);
  });

  it("retries failed batch then succeeds", async () => {
    const run = jest.fn<(batch: string[]) => Promise<void>>();
    run
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);

    const queue = createCoalesceQueue({
      label: "test",
      retryDelayMs: 20,
      run,
    });

    await queue.schedule(["/a"]);

    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenNthCalledWith(1, ["/a"]);
    expect(run).toHaveBeenNthCalledWith(2, ["/a"]);
  });

  it("gives up after max consecutive failures", async () => {
    const run = jest.fn<(batch: string[]) => Promise<void>>();
    run.mockRejectedValue(new Error("boom"));

    const queue = createCoalesceQueue({
      label: "test",
      retryDelayMs: 10,
      maxConsecutiveFailures: 2,
      run,
    });

    await queue.schedule(["/a"]);

    expect(run).toHaveBeenCalledTimes(2);
  });
});
