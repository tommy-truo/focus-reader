import type { ChunkMode } from "./segmenter";

export type ReaderType = "sans" | "serif";
export type ReaderTheme = "light" | "dark" | "sepia";

/**
 * Appearance and chunking preferences shown in the reader overlay.
 * Persistence lives outside this module (storage adapter).
 */
export type ReaderSettings = {
  type: ReaderType;
  theme: ReaderTheme;
  chunkMode: ChunkMode;
  /** Token count per chunk when `chunkMode` is `custom`. */
  wordCount: number;
};

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  type: "sans",
  theme: "light",
  chunkMode: "auto",
  wordCount: 12,
};

export function clampWordCount(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_READER_SETTINGS.wordCount;
  }
  return Math.min(50, Math.max(1, Math.trunc(value)));
}
