import type { ChunkMode } from "./segmenter";

export const READER_FONTS = [
  "Arial",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Georgia",
  "Times New Roman",
  "Palatino Linotype",
  "Courier New",
  "Segoe UI",
] as const;

export type ReaderFont = (typeof READER_FONTS)[number];
export type ReaderFontWeight = "normal" | "bold";
export type ReaderTheme = "light" | "dark" | "custom";

export const READER_FONT_STACKS: Record<ReaderFont, string> = {
  Arial: "Arial, Helvetica, sans-serif",
  Verdana: "Verdana, Geneva, sans-serif",
  Tahoma: "Tahoma, Geneva, sans-serif",
  "Trebuchet MS": '"Trebuchet MS", Tahoma, sans-serif',
  Georgia: "Georgia, serif",
  "Times New Roman": '"Times New Roman", Times, serif',
  "Palatino Linotype": '"Palatino Linotype", Palatino, serif',
  "Courier New": '"Courier New", Courier, monospace',
  "Segoe UI": '"Segoe UI", system-ui, sans-serif',
};

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 64;
export const DEFAULT_CUSTOM_BACKGROUND = "#f1e6cf";
export const DEFAULT_CUSTOM_TEXT = "#3b2f1e";

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX3 = /^#[0-9a-fA-F]{3}$/;

/**
 * Appearance and chunking preferences shown in the reader overlay.
 * Persistence lives outside this module (storage adapter).
 */
export type ReaderSettings = {
  font: ReaderFont;
  fontSize: number;
  fontWeight: ReaderFontWeight;
  theme: ReaderTheme;
  customBackground: string;
  customText: string;
  chunkMode: ChunkMode;
  /** Token count per chunk when `chunkMode` is `custom`. */
  wordCount: number;
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  font: "Arial",
  fontSize: 28,
  fontWeight: "normal",
  theme: "light",
  customBackground: DEFAULT_CUSTOM_BACKGROUND,
  customText: DEFAULT_CUSTOM_TEXT,
  chunkMode: "auto",
  wordCount: 12,
};

export function isReaderFont(value: unknown): value is ReaderFont {
  return typeof value === "string" && (READER_FONTS as readonly string[]).includes(value);
}

export function clampWordCount(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_READER_SETTINGS.wordCount;
  }
  return Math.min(50, Math.max(1, Math.trunc(value)));
}

export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_READER_SETTINGS.fontSize;
  }
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.trunc(value)));
}

export function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (HEX6.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (HEX3.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export function normalizeReaderSettings(raw: unknown): ReaderSettings {
  const merged: ReaderSettings = { ...DEFAULT_READER_SETTINGS };
  if (raw === null || typeof raw !== "object") {
    return merged;
  }

  const value = raw as Record<string, unknown>;

  if (isReaderFont(value.font)) {
    merged.font = value.font;
  } else if (value.type === "serif") {
    merged.font = "Times New Roman";
  } else if (value.type === "sans") {
    merged.font = "Arial";
  }

  if (typeof value.fontSize === "number") {
    merged.fontSize = clampFontSize(value.fontSize);
  }
  if (value.fontWeight === "normal" || value.fontWeight === "bold") {
    merged.fontWeight = value.fontWeight;
  }

  if (value.theme === "light" || value.theme === "dark" || value.theme === "custom") {
    merged.theme = value.theme;
  } else if (value.theme === "sepia") {
    merged.theme = "custom";
    merged.customBackground = DEFAULT_CUSTOM_BACKGROUND;
    merged.customText = DEFAULT_CUSTOM_TEXT;
  }

  if (typeof value.customBackground === "string") {
    merged.customBackground = normalizeHexColor(
      value.customBackground,
      DEFAULT_CUSTOM_BACKGROUND,
    );
  }
  if (typeof value.customText === "string") {
    merged.customText = normalizeHexColor(value.customText, DEFAULT_CUSTOM_TEXT);
  }

  if (value.chunkMode === "auto" || value.chunkMode === "custom") {
    merged.chunkMode = value.chunkMode;
  }
  if (typeof value.wordCount === "number") {
    merged.wordCount = clampWordCount(value.wordCount);
  }
  return merged;
}
