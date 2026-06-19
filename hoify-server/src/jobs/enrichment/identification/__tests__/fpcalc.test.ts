import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockLogger = { debug: jest.fn(), warn: jest.fn(), info: jest.fn() };

// fpcalc is a callback-based function
const mockFpcalc = jest.fn<
  (
    filePath: string,
    cb: (err: Error | null, result?: { fingerprint: string; duration: number }) => void,
  ) => void
>();

jest.unstable_mockModule("fpcalc", () => ({
  default: mockFpcalc,
}));

jest.unstable_mockModule("../../../../util/logger", () => ({
  logger: mockLogger,
}));

const { getFingerprint, __testResetCache } = await import("../fpcalc.js");

beforeEach(() => {
  jest.clearAllMocks();
  __testResetCache();
});

describe("getFingerprint", () => {
  it("returns fingerprint + duration when fpcalc succeeds", async () => {
    mockFpcalc.mockImplementation((_filePath, cb) => {
      cb(null, { fingerprint: "ABCDEF", duration: 240 });
    });

    const result = await getFingerprint("/music/song.mp3");
    expect(result).toEqual({ fingerprint: "ABCDEF", duration: 240 });
  });

  it("returns null when fpcalc binary fails", async () => {
    mockFpcalc.mockImplementation((_filePath, cb) => {
      cb(new Error("fpcalc crashed"));
    });

    const result = await getFingerprint("/music/song.mp3");
    expect(result).toBeNull();
  });

  it("calls fpcalc again for each file when available", async () => {
    mockFpcalc.mockImplementation((_filePath, cb) => {
      cb(null, { fingerprint: "FP", duration: 100 });
    });

    await getFingerprint("/music/song1.mp3");
    await getFingerprint("/music/song2.mp3");

    expect(mockFpcalc).toHaveBeenCalledTimes(2);
  });

  it("only warns about missing fpcalc once", async () => {
    // First call: no fpcalc available, skip fpcalc
    mockFpcalc.mockImplementation((_filePath, cb) => {
      cb(new Error("not found"));
    });

    await getFingerprint("/music/song1.mp3");
    await getFingerprint("/music/song2.mp3");

    // warn should only fire once (cache hit)
    const warnCalls = mockLogger.warn.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === "string" && (c[0] as string).includes("fpcalc"),
    );
    expect(warnCalls.length).toBeLessThanOrEqual(1);
  });
});
