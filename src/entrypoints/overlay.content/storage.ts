import { browser } from "wxt/browser";
import {
  DEFAULT_READER_SETTINGS,
  clampWordCount,
  type ReaderSettings,
} from "../../core/settings";

const STORAGE_KEY = "readerSettings";

export async function loadSettings(): Promise<ReaderSettings> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return mergeSettings(stored[STORAGE_KEY]);
}

export async function saveSettings(settings: ReaderSettings): Promise<void> {
  const next: ReaderSettings = {
    ...DEFAULT_READER_SETTINGS,
    ...settings,
    wordCount: clampWordCount(settings.wordCount),
  };
  await browser.storage.local.set({ [STORAGE_KEY]: next });
}

function mergeSettings(raw: unknown): ReaderSettings {
  const merged: ReaderSettings = { ...DEFAULT_READER_SETTINGS };
  if (raw === null || typeof raw !== "object") {
    return merged;
  }

  const value = raw as Record<string, unknown>;
  if (value.type === "sans" || value.type === "serif") {
    merged.type = value.type;
  }
  if (value.theme === "light" || value.theme === "dark" || value.theme === "sepia") {
    merged.theme = value.theme;
  }
  if (value.chunkMode === "auto" || value.chunkMode === "custom") {
    merged.chunkMode = value.chunkMode;
  }
  if (typeof value.wordCount === "number") {
    merged.wordCount = clampWordCount(value.wordCount);
  }
  return merged;
}
