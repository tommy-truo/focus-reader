import { defineContentScript } from "wxt/utils/define-content-script";
import { browser } from "wxt/browser";
import { startReadingSession } from "../../page/reading-session";
import { loadSettings, saveSettings } from "./storage";

const START_SESSION_TYPE = "focus-reader/start-session";
const HOST_ID = "focus-reader-host";
const INJECTED_FLAG = "__focusReaderOverlayInjected";

type StartSessionMessage = {
  type: typeof START_SESSION_TYPE;
  fallbackText?: string;
};

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  registration: "runtime",
  allFrames: true,
  runAt: "document_idle",
  main() {
    if (isAlreadyInjected()) {
      return;
    }
    markInjected();
    if (!isTopFrame()) {
      return;
    }

    browser.runtime.onMessage.addListener((message) => {
      if (!isStartSessionMessage(message)) {
        return;
      }
      void startOverlay(message.fallbackText);
    });
  },
});

function isAlreadyInjected(): boolean {
  return (globalThis as Record<string, unknown>)[INJECTED_FLAG] === true;
}

function markInjected(): void {
  (globalThis as Record<string, unknown>)[INJECTED_FLAG] = true;
}

function isTopFrame(): boolean {
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
}

function isStartSessionMessage(message: unknown): message is StartSessionMessage {
  if (message === null || typeof message !== "object") {
    return false;
  }
  return (message as { type?: unknown }).type === START_SESSION_TYPE;
}

async function startOverlay(fallbackText?: string): Promise<void> {
  if (document.getElementById(HOST_ID)) {
    return;
  }

  const settings = await loadSettings();
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483647";
  const shadowRoot = host.attachShadow({ mode: "open" });
  document.documentElement.append(host);

  const session = startReadingSession({
    shadowRoot,
    settings,
    fallbackText,
    onSettingsChange(next) {
      void saveSettings(next);
    },
  });

  if (session === null) {
    host.remove();
  }
}
