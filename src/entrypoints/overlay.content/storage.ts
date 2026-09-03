import { browser } from "wxt/browser";
import {
  DEFAULT_READER_SETTINGS,
  clampWordCount,
  normalizeReaderSettings,
  type ReaderSettings,
} from "../../core/settings";

const STORAGE_KEY = "readerSettings";

export async function loadSettings(): Promise<ReaderSettings> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return normalizeReaderSettings(stored[STORAGE_KEY]);
}

export async function saveSettings(settings: ReaderSettings): Promise<void> {
  const next = normalizeReaderSettings({
    ...DEFAULT_READER_SETTINGS,
    ...settings,
    wordCount: clampWordCount(settings.wordCount),
  });
  await browser.storage.local.set({ [STORAGE_KEY]: next });
}
