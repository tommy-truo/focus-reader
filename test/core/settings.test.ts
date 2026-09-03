import { describe, expect, it } from "vitest";
import {
  clampFontSize,
  clampWordCount,
  DEFAULT_CUSTOM_BACKGROUND,
  DEFAULT_CUSTOM_TEXT,
  DEFAULT_READER_SETTINGS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  normalizeHexColor,
  normalizeReaderSettings,
} from "../../src/core/settings";

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

describe("clampFontSize", () => {
  it("keeps values in the allowed range", () => {
    expect(clampFontSize(28)).toBe(28);
    expect(clampFontSize(FONT_SIZE_MIN)).toBe(FONT_SIZE_MIN);
    expect(clampFontSize(FONT_SIZE_MAX)).toBe(FONT_SIZE_MAX);
  });

  it("clamps out of range and non-finite values", () => {
    expect(clampFontSize(FONT_SIZE_MIN - 4)).toBe(FONT_SIZE_MIN);
    expect(clampFontSize(FONT_SIZE_MAX + 10)).toBe(FONT_SIZE_MAX);
    expect(clampFontSize(20.7)).toBe(20);
    expect(clampFontSize(Number.NaN)).toBe(DEFAULT_READER_SETTINGS.fontSize);
  });
});

describe("normalizeHexColor", () => {
  it("accepts 3- and 6-digit hex colors", () => {
    expect(normalizeHexColor("#AbCdEf", "#000000")).toBe("#abcdef");
    expect(normalizeHexColor("#0f8", "#000000")).toBe("#00ff88");
  });

  it("falls back for invalid values", () => {
    expect(normalizeHexColor("red", "#112233")).toBe("#112233");
    expect(normalizeHexColor(12, "#112233")).toBe("#112233");
  });
});

describe("normalizeReaderSettings", () => {
  it("maps legacy type and sepia theme", () => {
    expect(
      normalizeReaderSettings({
        type: "serif",
        theme: "sepia",
        chunkMode: "custom",
        wordCount: 8,
      }),
    ).toMatchObject({
      font: "Times New Roman",
      theme: "custom",
      customBackground: DEFAULT_CUSTOM_BACKGROUND,
      customText: DEFAULT_CUSTOM_TEXT,
      chunkMode: "custom",
      wordCount: 8,
    });
  });

  it("keeps a known font and custom colors", () => {
    expect(
      normalizeReaderSettings({
        font: "Verdana",
        fontSize: 40,
        fontWeight: "bold",
        theme: "custom",
        customBackground: "#101010",
        customText: "#eee",
      }),
    ).toMatchObject({
      font: "Verdana",
      fontSize: 40,
      fontWeight: "bold",
      theme: "custom",
      customBackground: "#101010",
      customText: "#eeeeee",
    });
  });
});
