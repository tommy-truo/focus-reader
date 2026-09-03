import { describe, expect, it } from "vitest";
import { clampWordCount, DEFAULT_READER_SETTINGS } from "../../src/core/settings";

describe("clampWordCount", () => {
  it("keeps values in 1..50", () => {
    expect(clampWordCount(8)).toBe(8);
    expect(clampWordCount(1)).toBe(1);
    expect(clampWordCount(50)).toBe(50);
  });

  it("clamps out of range and non-finite values", () => {
    expect(clampWordCount(0)).toBe(1);
    expect(clampWordCount(99)).toBe(50);
    expect(clampWordCount(3.9)).toBe(3);
    expect(clampWordCount(Number.NaN)).toBe(DEFAULT_READER_SETTINGS.wordCount);
  });
});
