import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";
import type { Browser } from "wxt/browser";

const START_SESSION_TYPE = "focus-reader/start-session";
const CONTEXT_MENU_ID = "focus-reader-read";
const OVERLAY_SCRIPT = "content-scripts/overlay.js" as "/content-scripts/overlay.js";

export default defineBackground(() => {
  void ensureContextMenu();
  browser.runtime.onInstalled.addListener(() => {
    void ensureContextMenu();
  });

  browser.action.onClicked.addListener((tab) => {
    void startOnTab(tab);
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID || tab == null) {
      return;
    }
    void startOnTab(tab, info.selectionText);
  });
});

async function ensureContextMenu(): Promise<void> {
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Read with Focus Reader",
    contexts: ["selection"],
  });
}

async function startOnTab(
  tab: Browser.tabs.Tab,
  fallbackText?: string,
): Promise<void> {
  if (tab.id == null) {
    return;
  }
  if (isRestrictedUrl(tab.url)) {
    return;
  }

  const injected = await injectOverlay(tab.id);
  if (!injected) {
    return;
  }

  try {
    await browser.tabs.sendMessage(tab.id, {
      type: START_SESSION_TYPE,
      fallbackText,
    });
  } catch {
    // Restricted frame or script did not load a listener.
  }
}

async function injectOverlay(tabId: number): Promise<boolean> {
  try {
    await browser.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: [OVERLAY_SCRIPT],
    });
    return true;
  } catch {
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: [OVERLAY_SCRIPT],
      });
      return true;
    } catch {
      return false;
    }
  }
}

function isRestrictedUrl(url: string | undefined): boolean {
  if (url == null || url === "") {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  if (
    parsed.protocol === "chrome:" ||
    parsed.protocol === "chrome-extension:" ||
    parsed.protocol === "devtools:" ||
    parsed.protocol === "about:"
  ) {
    return true;
  }

  if (parsed.hostname === "chromewebstore.google.com") {
    return true;
  }
  return (
    parsed.hostname === "chrome.google.com" &&
    parsed.pathname.startsWith("/webstore")
  );
}
