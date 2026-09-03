import { cleanseText } from "../core/text-cleanser";
import { tokenize } from "../core/tokenizer";
import { normalizeTokens } from "../core/token-normalizer";
import { segment } from "../core/segmenter";
import { remap } from "../core/remapper";
import { createNavigator, type Navigator } from "../core/navigator";
import type { ReaderSettings } from "../core/settings";
import { captureText } from "./text-capture";
import { createReaderView, type ReaderView } from "./reader-view";

const SESSION_LOCALE = "en";

export type ReadingSessionOptions = {
  shadowRoot: ShadowRoot;
  settings: ReaderSettings;
  fallbackText?: string;
  onSettingsChange: (settings: ReaderSettings) => void;
  onClose?: () => void;
};

export type ReadingSession = {
  stop(): void;
};

/**
 * Capture → pipeline → overlay. Holds captured text for mid-session rebuilds.
 * Chrome APIs stay in entrypoints; this module is DOM + core only.
 */
export function startReadingSession(
  options: ReadingSessionOptions,
): ReadingSession | null {
  const captured = captureText(options.fallbackText ?? "");
  if (captured === "") {
    return null;
  }

  const { shadowRoot, onSettingsChange } = options;
  let settings: ReaderSettings = { ...options.settings };
  let chunks = buildChunks(captured, settings);
  let navigator: Navigator = createNavigator(chunks, 0);
  let stopped = false;

  const view: ReaderView = createReaderView({
    shadowRoot,
    navigator,
    settings,
    onClose: stop,
    onSettingsChange: handleSettingsChange,
  });

  function handleSettingsChange(next: ReaderSettings): void {
    const chunkingChanged =
      next.chunkMode !== settings.chunkMode ||
      next.wordCount !== settings.wordCount;
    settings = { ...next };
    onSettingsChange({ ...next });
    if (chunkingChanged) {
      rebuild();
    }
  }

  function rebuild(): void {
    const newChunks = buildChunks(captured, settings);
    const newIndex = remap(chunks, navigator.index, newChunks);
    chunks = newChunks;
    navigator = createNavigator(newChunks, newIndex);
    view.setNavigator(navigator);
  }

  function stop(): void {
    if (stopped) {
      return;
    }
    stopped = true;
    view.destroy();
    shadowRoot.host.remove();
    options.onClose?.();
  }

  return { stop };
}

function buildChunks(captured: string, settings: ReaderSettings): string[] {
  const tokens = normalizeTokens(tokenize(cleanseText(captured), SESSION_LOCALE));
  return segment(tokens, captured, SESSION_LOCALE, {
    mode: settings.chunkMode,
    wordCount: settings.wordCount,
  });
}
