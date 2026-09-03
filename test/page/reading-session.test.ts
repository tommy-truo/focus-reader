import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_READER_SETTINGS } from "../../src/core/settings";
import { startReadingSession } from "../../src/page/reading-session";
import type { ReaderSettings } from "../../src/core/settings";

const LONG_TEXT =
  "The morning light spread across the valley. Birds called from the trees. " +
  "A narrow path led toward the river, and the air smelled like rain.";

const sessions: Array<{ stop(): void }> = [];

function mount(options?: {
  text?: string;
  fallbackText?: string;
  settings?: ReaderSettings;
}) {
  const host = document.createElement("div");
  document.body.append(host);
  const shadowRoot = host.attachShadow({ mode: "open" });
  const onSettingsChange = vi.fn();
  const onClose = vi.fn();

  if (options?.text != null) {
    const paragraph = document.createElement("p");
    paragraph.textContent = options.text;
    document.body.append(paragraph);
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  const session = startReadingSession({
    shadowRoot,
    settings: options?.settings ?? DEFAULT_READER_SETTINGS,
    fallbackText: options?.fallbackText,
    onSettingsChange,
    onClose,
  });
  if (session) {
    sessions.push(session);
  }
  return { host, shadowRoot, session, onSettingsChange, onClose };
}

function q<T extends Element>(root: ShadowRoot, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`missing ${selector}`);
  return el;
}

describe("startReadingSession", () => {
  afterEach(() => {
    for (const session of sessions) {
      session.stop();
    }
    sessions.length = 0;
    window.getSelection()?.removeAllRanges();
    document.body.replaceChildren();
    document.documentElement.style.overflow = "";
  });

  it("does not mount when capture is empty", () => {
    const { host, shadowRoot, session } = mount();
    expect(session).toBeNull();
    expect(shadowRoot.childNodes.length).toBe(0);
    expect(host.isConnected).toBe(true);
  });

  it("mounts the overlay on the first chunk of a selection", () => {
    const { shadowRoot, session } = mount({ text: LONG_TEXT });
    expect(session).not.toBeNull();
    const chunk = q<HTMLElement>(shadowRoot, ".fr-chunk");
    expect(chunk.textContent).not.toBe("");
    expect(q<HTMLElement>(shadowRoot, ".fr-place").textContent).toMatch(/^1 \//);
  });

  it("shows a custom heading on its own chunk before the following paragraph", () => {
    document.body.innerHTML =
      "<section><p-heading>Porsche 718 Cayman</p-heading><p-text>The Porsche 718 Cayman is a mid-engined coupe with compact proportions and a focused sportscar character.</p-text></section>";
    const range = document.createRange();
    range.selectNodeContents(document.querySelector("section")!);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const { shadowRoot, session } = mount();
    expect(session).not.toBeNull();
    expect(q<HTMLElement>(shadowRoot, ".fr-chunk").textContent).toBe(
      "Porsche 718 Cayman",
    );
    expect(q<HTMLElement>(shadowRoot, ".fr-place").textContent).toMatch(
      /^1 \/ [2-9]\d*$/,
    );
  });

  it("uses fallbackText when nothing is selected", () => {
    const { shadowRoot, session } = mount({ fallbackText: "Fallback chunk." });
    expect(session).not.toBeNull();
    expect(q<HTMLElement>(shadowRoot, ".fr-chunk").textContent).toBe(
      "Fallback chunk.",
    );
  });

  it("rebuilds chunks when mode changes and restyles font without rebuilding", () => {
    const { shadowRoot, onSettingsChange } = mount({ text: LONG_TEXT });
    const chunkBefore = q<HTMLElement>(shadowRoot, ".fr-chunk").textContent;
    const overlay = q<HTMLElement>(shadowRoot, ".fr-overlay");

    const fontSelect = q<HTMLSelectElement>(shadowRoot, 'select[name="font"]');
    fontSelect.value = "Georgia";
    fontSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onSettingsChange).toHaveBeenCalled();
    expect(overlay.style.getPropertyValue("--font")).toContain("Georgia");
    expect(q<HTMLElement>(shadowRoot, ".fr-chunk").textContent).toBe(chunkBefore);

    q<HTMLInputElement>(shadowRoot, 'input[name="chunkMode"][value="custom"]').click();
    const chunkAfter = q<HTMLElement>(shadowRoot, ".fr-chunk").textContent;
    expect(chunkAfter).not.toBe("");
    expect(onSettingsChange.mock.calls.at(-1)?.[0]).toMatchObject({
      chunkMode: "custom",
    });
  });

  it("removes the host and overlay on stop", () => {
    const { host, shadowRoot, session } = mount({ text: LONG_TEXT });
    expect(session).not.toBeNull();
    session!.stop();
    expect(host.isConnected).toBe(false);
    expect(shadowRoot.childNodes.length).toBe(0);
  });
});
