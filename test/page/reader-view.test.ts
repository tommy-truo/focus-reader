import { afterEach, describe, expect, it, vi } from "vitest";
import { createNavigator } from "../../src/core/navigator";
import { DEFAULT_READER_SETTINGS } from "../../src/core/settings";
import { createReaderView } from "../../src/page/reader-view";
import type { ReaderSettings } from "../../src/core/settings";

const CHUNKS = ["First chunk.", "Second chunk.", "Last chunk."];
const views: ReturnType<typeof createReaderView>[] = [];

function mount(options?: {
  chunks?: string[];
  startIndex?: number;
  settings?: ReaderSettings;
}) {
  const host = document.createElement("div");
  document.body.append(host);
  const shadowRoot = host.attachShadow({ mode: "open" });
  const onClose = vi.fn();
  const onSettingsChange = vi.fn();
  const navigator = createNavigator(options?.chunks ?? CHUNKS, options?.startIndex);
  const view = createReaderView({
    shadowRoot,
    navigator,
    settings: options?.settings ?? DEFAULT_READER_SETTINGS,
    onClose,
    onSettingsChange,
  });
  views.push(view);
  return { host, shadowRoot, view, navigator, onClose, onSettingsChange };
}

function q<T extends Element>(root: ShadowRoot, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`missing ${selector}`);
  return el;
}

describe("createReaderView", () => {
  afterEach(() => {
    for (const view of views) {
      view.destroy();
    }
    views.length = 0;
    document.body.replaceChildren();
    document.documentElement.style.overflow = "";
  });

  describe("display", () => {
    it("shows the current chunk and a 1-based place marker", () => {
      const { shadowRoot } = mount();
      expect(q(shadowRoot, ".fr-chunk").textContent).toBe("First chunk.");
      expect(q(shadowRoot, ".fr-place").textContent).toBe("1 / 3");
    });

    it("disables previous on the first chunk and next on the last", () => {
      const first = mount();
      expect(q<HTMLButtonElement>(first.shadowRoot, ".fr-prev").disabled).toBe(true);
      expect(q<HTMLButtonElement>(first.shadowRoot, ".fr-next").disabled).toBe(false);
      expect(q<HTMLElement>(first.shadowRoot, ".fr-end-mark").hidden).toBe(true);
      first.view.destroy();

      const last = mount({ startIndex: 2 });
      expect(q<HTMLButtonElement>(last.shadowRoot, ".fr-prev").disabled).toBe(false);
      expect(q<HTMLButtonElement>(last.shadowRoot, ".fr-next").disabled).toBe(true);
      expect(q<HTMLElement>(last.shadowRoot, ".fr-end-mark").hidden).toBe(false);
      expect(q(last.shadowRoot, ".fr-end-label").textContent).toBe("End reached!");
    });

    it("bursts confetti when the end-of-section popper is clicked", () => {
      const { shadowRoot } = mount({ startIndex: 2 });
      q<HTMLButtonElement>(shadowRoot, ".fr-confetti-btn").click();
      expect(shadowRoot.querySelectorAll(".fr-confetti-piece").length).toBeGreaterThan(10);
    });

    it("shows an end mark only on the last non-empty chunk", () => {
      const empty = mount({ chunks: [] });
      expect(q(empty.shadowRoot, ".fr-chunk").textContent).toBe("");
      expect(q(empty.shadowRoot, ".fr-place").textContent).toBe("0 / 0");
      expect(q<HTMLElement>(empty.shadowRoot, ".fr-end-mark").hidden).toBe(true);
    });

    it("announces the current chunk to screen readers", () => {
      const { shadowRoot } = mount();
      expect(q(shadowRoot, ".fr-chunk").getAttribute("aria-live")).toBe("polite");
    });
  });

  describe("movement", () => {
    it("moves with Previous and Next", () => {
      const { shadowRoot, navigator } = mount();
      q<HTMLButtonElement>(shadowRoot, ".fr-next").click();
      expect(navigator.index).toBe(1);
      expect(q(shadowRoot, ".fr-chunk").textContent).toBe("Second chunk.");
      expect(q(shadowRoot, ".fr-place").textContent).toBe("2 / 3");

      q<HTMLButtonElement>(shadowRoot, ".fr-prev").click();
      expect(navigator.index).toBe(0);
      expect(q(shadowRoot, ".fr-chunk").textContent).toBe("First chunk.");
    });

    it("moves with left and right arrows", () => {
      const { shadowRoot, navigator } = mount();
      const overlay = q<HTMLElement>(shadowRoot, ".fr-overlay");
      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      expect(navigator.index).toBe(1);
      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      expect(navigator.index).toBe(0);
    });

    it("moves with the wheel after a step threshold", () => {
      const { shadowRoot, navigator } = mount();
      const overlay = q<HTMLElement>(shadowRoot, ".fr-overlay");
      overlay.dispatchEvent(new WheelEvent("wheel", { deltaY: 80, bubbles: true }));
      expect(navigator.index).toBe(1);
      overlay.dispatchEvent(new WheelEvent("wheel", { deltaY: -80, bubbles: true }));
      expect(navigator.index).toBe(0);
    });

    it("does not wrap at the ends", () => {
      const { shadowRoot, navigator } = mount({ startIndex: 2 });
      q<HTMLButtonElement>(shadowRoot, ".fr-next").click();
      q<HTMLElement>(shadowRoot, ".fr-overlay").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
      expect(navigator.index).toBe(2);
    });
  });

  describe("settings", () => {
    it("applies font, weight, size, and theme immediately and emits the updated settings", () => {
      const { shadowRoot, onSettingsChange } = mount();
      q<HTMLButtonElement>(shadowRoot, ".fr-settings-toggle").click();
      const overlay = q<HTMLElement>(shadowRoot, ".fr-overlay");
      expect(overlay.dataset.theme).toBe("light");
      expect(overlay.style.getPropertyValue("--font")).toContain("Arial");

      q<HTMLInputElement>(shadowRoot, 'input[name="theme"][value="dark"]').click();
      expect(overlay.dataset.theme).toBe("dark");
      expect(onSettingsChange).toHaveBeenLastCalledWith({
        ...DEFAULT_READER_SETTINGS,
        theme: "dark",
      });

      const fontSelect = q<HTMLSelectElement>(shadowRoot, 'select[name="font"]');
      fontSelect.value = "Times New Roman";
      fontSelect.dispatchEvent(new Event("change", { bubbles: true }));
      expect(overlay.style.getPropertyValue("--font")).toContain("Times New Roman");
      expect(onSettingsChange).toHaveBeenLastCalledWith({
        ...DEFAULT_READER_SETTINGS,
        theme: "dark",
        font: "Times New Roman",
      });

      q<HTMLInputElement>(shadowRoot, 'input[name="fontWeight"]').click();
      expect(overlay.style.getPropertyValue("--chunk-weight")).toBe("700");
      expect(onSettingsChange).toHaveBeenLastCalledWith({
        ...DEFAULT_READER_SETTINGS,
        theme: "dark",
        font: "Times New Roman",
        fontWeight: "bold",
      });

      const fontSize = q<HTMLInputElement>(shadowRoot, 'input[name="fontSize"]');
      fontSize.value = "36";
      fontSize.dispatchEvent(new Event("change", { bubbles: true }));
      expect(overlay.style.getPropertyValue("--chunk-size")).toBe("36px");
      expect(onSettingsChange).toHaveBeenLastCalledWith({
        ...DEFAULT_READER_SETTINGS,
        theme: "dark",
        font: "Times New Roman",
        fontWeight: "bold",
        fontSize: 36,
      });
    });

    it("shows custom color controls and applies background and text colors", () => {
      const { shadowRoot, onSettingsChange } = mount();
      q<HTMLButtonElement>(shadowRoot, ".fr-settings-toggle").click();
      const overlay = q<HTMLElement>(shadowRoot, ".fr-overlay");
      const customColors = q<HTMLElement>(shadowRoot, ".fr-custom-colors");
      expect(customColors.hidden).toBe(true);

      q<HTMLInputElement>(shadowRoot, 'input[name="theme"][value="custom"]').click();
      expect(overlay.dataset.theme).toBe("custom");
      expect(customColors.hidden).toBe(false);

      const background = q<HTMLInputElement>(shadowRoot, 'input[name="customBackground"]');
      background.value = "#112233";
      background.dispatchEvent(new Event("input", { bubbles: true }));
      expect(overlay.style.getPropertyValue("--custom-bg")).toBe("#112233");
      expect(onSettingsChange).toHaveBeenLastCalledWith({
        ...DEFAULT_READER_SETTINGS,
        theme: "custom",
        customBackground: "#112233",
      });

      const text = q<HTMLInputElement>(shadowRoot, 'input[name="customText"]');
      text.value = "#abcdef";
      text.dispatchEvent(new Event("change", { bubbles: true }));
      expect(overlay.style.getPropertyValue("--custom-text")).toBe("#abcdef");
      expect(onSettingsChange).toHaveBeenLastCalledWith({
        ...DEFAULT_READER_SETTINGS,
        theme: "custom",
        customBackground: "#112233",
        customText: "#abcdef",
      });
    });

    it("emits chunk mode and words-on-screen without changing the current chunks", () => {
      const { shadowRoot, navigator, onSettingsChange } = mount();
      q<HTMLButtonElement>(shadowRoot, ".fr-settings-toggle").click();
      q<HTMLInputElement>(shadowRoot, 'input[name="chunkMode"][value="custom"]').click();
      expect(onSettingsChange).toHaveBeenLastCalledWith({
        ...DEFAULT_READER_SETTINGS,
        chunkMode: "custom",
      });
      expect(navigator.current).toBe("First chunk.");
      expect(navigator.total).toBe(3);

      const wordCount = q<HTMLInputElement>(shadowRoot, ".fr-word-count");
      wordCount.value = "8";
      wordCount.dispatchEvent(new Event("change", { bubbles: true }));
      expect(onSettingsChange).toHaveBeenLastCalledWith({
        ...DEFAULT_READER_SETTINGS,
        chunkMode: "custom",
        wordCount: 8,
      });
    });
  });

  describe("close", () => {
    it("calls close from the close button", () => {
      const { shadowRoot, onClose } = mount();
      q<HTMLButtonElement>(shadowRoot, ".fr-close").click();
      expect(onClose).toHaveBeenCalledOnce();
    });

    it("closes the settings panel on Escape before ending the session", () => {
      const { shadowRoot, onClose } = mount();
      const overlay = q<HTMLElement>(shadowRoot, ".fr-overlay");
      q<HTMLButtonElement>(shadowRoot, ".fr-settings-toggle").click();
      expect(q<HTMLElement>(shadowRoot, ".fr-settings").hidden).toBe(false);

      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(q<HTMLElement>(shadowRoot, ".fr-settings").hidden).toBe(true);
      expect(onClose).not.toHaveBeenCalled();

      overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe("focus", () => {
    it("keeps Tab inside the overlay", () => {
      const { shadowRoot } = mount();
      const overlay = q<HTMLElement>(shadowRoot, ".fr-overlay");
      const next = q<HTMLButtonElement>(shadowRoot, ".fr-next");
      next.focus();
      overlay.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
      );
      expect(shadowRoot.activeElement).toBe(
        q<HTMLButtonElement>(shadowRoot, ".fr-settings-toggle"),
      );
    });
  });

  describe("rebuild handoff", () => {
    it("refreshes from a new navigator without recapturing text", () => {
      const { shadowRoot, view, navigator } = mount();
      navigator.next();
      const rebuilt = createNavigator(["one", "two three", "four"], 2);
      view.setNavigator(rebuilt);
      expect(q(shadowRoot, ".fr-chunk").textContent).toBe("four");
      expect(q(shadowRoot, ".fr-place").textContent).toBe("3 / 3");
      expect(q<HTMLButtonElement>(shadowRoot, ".fr-next").disabled).toBe(true);
      expect(q<HTMLElement>(shadowRoot, ".fr-end-mark").hidden).toBe(false);
    });
  });

  describe("lifecycle", () => {
    it("clears the shadow root on destroy", () => {
      const { shadowRoot, view } = mount();
      view.destroy();
      expect(shadowRoot.childNodes).toHaveLength(0);
    });
  });
});
