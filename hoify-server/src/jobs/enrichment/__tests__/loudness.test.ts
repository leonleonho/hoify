import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockLogger = { debug: jest.fn(), warn: jest.fn(), info: jest.fn() };

jest.unstable_mockModule("../../../util/logger", () => ({
  logger: mockLogger,
}));

const { gainForLoudness, parseIntegratedLoudness } = await import("../loudness.js");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("gainForLoudness", () => {
  it("returns 1 when a track is already at the target (-14 LUFS)", () => {
    expect(gainForLoudness(-14)).toBe(1);
  });

  it("boosts quiet tracks (lower LUFS) above 1", () => {
    expect(gainForLoudness(-20)).toBeGreaterThan(1);
  });

  it("attenuates loud tracks (higher LUFS) below 1", () => {
    expect(gainForLoudness(-9)).toBeLessThan(1);
  });

  it("supports a custom target", () => {
    // A -20 LUFS track normalized to -23 target should be attenuated.
    expect(gainForLoudness(-20, -23)).toBeLessThan(1);
  });

  it("clamps extreme boosts to avoid blowing out silent files", () => {
    // 10^(12/20) = 3.9811 (gain capped at +12 dB)
    expect(gainForLoudness(-80)).toBeCloseTo(3.9811, 4);
  });

  it("clamps extreme attenuation", () => {
    // 10^(-12/20) = 0.2512 (gain capped at -12 dB)
    expect(gainForLoudness(0)).toBeCloseTo(0.2512, 4);
  });

  it("rounds to 4 decimal places", () => {
    // 10^(6/20) = 1.99526... -> rounded to 1.9953
    expect(gainForLoudness(-20)).toBeCloseTo(1.9953, 4);
  });
});

describe("parseIntegratedLoudness", () => {
  it("parses the integrated loudness from the summary line", () => {
    const stderr = [
      "t: 0.0999773 I: -70.0 LUFS LRA: 0.0 LU",
      "  Integrated loudness:",
      "    I:         -21.1 LUFS",
    ].join("\n");
    expect(parseIntegratedLoudness(stderr)).toBeCloseTo(-21.1, 1);
  });

  it("returns null when no I: value is present", () => {
    expect(parseIntegratedLoudness("no loudness data here")).toBeNull();
  });

  it("takes the last I: match (the summary, not the windows)", () => {
    const stderr = [
      "t: 0.1 I: -70.0 LUFS",
      "t: 0.2 I: -30.0 LUFS",
      "I: -15.3 LUFS",
    ].join("\n");
    expect(parseIntegratedLoudness(stderr)).toBeCloseTo(-15.3, 1);
  });
});
