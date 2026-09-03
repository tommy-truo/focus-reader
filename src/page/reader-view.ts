import type { Navigator } from "../core/navigator";
import {
  clampWordCount,
  type ReaderSettings,
  type ReaderTheme,
  type ReaderType,
} from "../core/settings";
import { READER_VIEW_CSS } from "./reader-view-styles";

export type ReaderViewOptions = {
  shadowRoot: ShadowRoot;
  navigator: Navigator;
  settings: ReaderSettings;
  onClose: () => void;
  onSettingsChange: (settings: ReaderSettings) => void;
};

export type ReaderView = {
  setNavigator(navigator: Navigator): void;
  destroy(): void;
};

const WHEEL_STEP = 80;
const FOCUSABLE_SELECTOR =
  "button:not([disabled]), input:not([disabled]), select:not([disabled])";

let instanceCount = 0;

export function createReaderView(options: ReaderViewOptions): ReaderView {
  const { shadowRoot, onClose, onSettingsChange } = options;
  let navigator = options.navigator;
  let settings: ReaderSettings = { ...options.settings };
  let settingsOpen = false;
  let destroyed = false;
  let wheelDelta = 0;

  const host = shadowRoot.host as HTMLElement;
  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";

  const uid = `fr-${++instanceCount}`;
  const chunkId = `${uid}-chunk`;
  const settingsId = `${uid}-settings`;

  const style = document.createElement("style");
  style.textContent = READER_VIEW_CSS;

  const overlay = document.createElement("div");
  overlay.className = "fr-overlay";
  overlay.tabIndex = -1;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", chunkId);
  applyAppearance(overlay, settings);

  overlay.innerHTML = `
    <div class="fr-toolbar">
      <button type="button" class="fr-settings-toggle" aria-expanded="false" aria-controls="${settingsId}">Settings</button>
      <button type="button" class="fr-close fr-icon-btn" aria-label="Close">&times;</button>
    </div>
    <form class="fr-settings" id="${settingsId}" hidden>
      <div class="fr-field">
        <span id="${uid}-type">Type</span>
        <div class="fr-options" role="radiogroup" aria-labelledby="${uid}-type">
          <label><input type="radio" name="type" value="sans"> Sans</label>
          <label><input type="radio" name="type" value="serif"> Serif</label>
        </div>
      </div>
      <div class="fr-field">
        <span id="${uid}-theme">Theme</span>
        <div class="fr-options" role="radiogroup" aria-labelledby="${uid}-theme">
          <label><input type="radio" name="theme" value="light"> Light</label>
          <label><input type="radio" name="theme" value="dark"> Dark</label>
          <label><input type="radio" name="theme" value="sepia"> Sepia</label>
        </div>
      </div>
      <div class="fr-field">
        <span id="${uid}-mode">Chunk mode</span>
        <div class="fr-options" role="radiogroup" aria-labelledby="${uid}-mode">
          <label><input type="radio" name="chunkMode" value="auto"> Auto</label>
          <label><input type="radio" name="chunkMode" value="custom"> Custom</label>
        </div>
      </div>
      <label class="fr-field">
        <span>Words on screen</span>
        <input class="fr-word-count" name="wordCount" type="number" min="1" max="50" step="1">
      </label>
    </form>
    <div class="fr-main">
      <p class="fr-chunk" id="${chunkId}" aria-live="polite"></p>
      <div class="fr-end-mark" hidden aria-label="End of selection"></div>
    </div>
    <div class="fr-footer">
      <button type="button" class="fr-prev">Previous</button>
      <span class="fr-place" aria-live="polite"></span>
      <button type="button" class="fr-next">Next</button>
    </div>
  `;

  const settingsForm = overlay.querySelector<HTMLFormElement>(".fr-settings")!;
  const settingsToggle = overlay.querySelector<HTMLButtonElement>(
    ".fr-settings-toggle",
  )!;
  const closeButton = overlay.querySelector<HTMLButtonElement>(".fr-close")!;
  const prevButton = overlay.querySelector<HTMLButtonElement>(".fr-prev")!;
  const nextButton = overlay.querySelector<HTMLButtonElement>(".fr-next")!;
  const chunkEl = overlay.querySelector<HTMLElement>(".fr-chunk")!;
  const placeEl = overlay.querySelector<HTMLElement>(".fr-place")!;
  const endMark = overlay.querySelector<HTMLElement>(".fr-end-mark")!;
  const wordCountInput = overlay.querySelector<HTMLInputElement>(".fr-word-count")!;

  syncSettingsForm();
  render();

  shadowRoot.replaceChildren(style, overlay);
  overlay.focus();

  overlay.addEventListener("keydown", onKeyDown);
  overlay.addEventListener("wheel", onWheel, { passive: false });
  overlay.addEventListener("click", onClick);
  settingsForm.addEventListener("change", onSettingsFormChange);
  document.addEventListener("focusin", onDocumentFocusIn);

  function emitSettings(): void {
    onSettingsChange({ ...settings });
  }

  function syncSettingsForm(): void {
    const typeInput = settingsForm.querySelector<HTMLInputElement>(
      `input[name="type"][value="${settings.type}"]`,
    );
    const themeInput = settingsForm.querySelector<HTMLInputElement>(
      `input[name="theme"][value="${settings.theme}"]`,
    );
    const modeInput = settingsForm.querySelector<HTMLInputElement>(
      `input[name="chunkMode"][value="${settings.chunkMode}"]`,
    );
    if (typeInput) typeInput.checked = true;
    if (themeInput) themeInput.checked = true;
    if (modeInput) modeInput.checked = true;
    wordCountInput.value = String(settings.wordCount);
    wordCountInput.disabled = settings.chunkMode !== "custom";
  }

  function render(): void {
    chunkEl.textContent = navigator.current;
    placeEl.textContent =
      navigator.total === 0 ? "0 / 0" : `${navigator.index + 1} / ${navigator.total}`;
    prevButton.disabled = navigator.isFirst;
    nextButton.disabled = navigator.isLast;
    endMark.hidden = !(navigator.isLast && navigator.total > 0);
  }

  function goNext(): void {
    if (navigator.isLast) return;
    navigator.next();
    render();
  }

  function goPrev(): void {
    if (navigator.isFirst) return;
    navigator.prev();
    render();
  }

  function setSettingsOpen(open: boolean): void {
    settingsOpen = open;
    settingsForm.hidden = !open;
    settingsToggle.setAttribute("aria-expanded", String(open));
    if (!open) {
      settingsToggle.focus();
    }
  }

  function closeSettingsOrSession(): void {
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    onClose();
  }

  function onClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".fr-close")) {
      onClose();
      return;
    }
    if (target.closest(".fr-settings-toggle")) {
      setSettingsOpen(!settingsOpen);
      return;
    }
    if (target.closest(".fr-next")) {
      goNext();
      return;
    }
    if (target.closest(".fr-prev")) {
      goPrev();
    }
  }

  function onSettingsFormChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    if (target.name === "type") {
      settings = { ...settings, type: target.value as ReaderType };
      applyAppearance(overlay, settings);
      emitSettings();
      return;
    }
    if (target.name === "theme") {
      settings = { ...settings, theme: target.value as ReaderTheme };
      applyAppearance(overlay, settings);
      emitSettings();
      return;
    }
    if (target.name === "chunkMode") {
      settings = { ...settings, chunkMode: target.value as ReaderSettings["chunkMode"] };
      wordCountInput.disabled = settings.chunkMode !== "custom";
      emitSettings();
      return;
    }
    if (target.name === "wordCount") {
      settings = { ...settings, wordCount: clampWordCount(target.valueAsNumber) };
      wordCountInput.value = String(settings.wordCount);
      emitSettings();
    }
  }

  function isTypingTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeSettingsOrSession();
      return;
    }

    if (event.key === "Tab") {
      trapFocus(event);
      return;
    }

    if (isTypingTarget(event.target)) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    }
  }

  function trapFocus(event: KeyboardEvent): void {
    const nodes = visibleFocusables();
    if (nodes.length === 0) {
      event.preventDefault();
      overlay.focus();
      return;
    }

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = shadowRoot.activeElement;

    if (event.shiftKey && (active === first || active === overlay)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function visibleFocusables(): HTMLElement[] {
    return [...overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
      (el) => !el.closest("[hidden]"),
    );
  }

  function onWheel(event: WheelEvent): void {
    if (isTypingTarget(event.target)) return;
    event.preventDefault();
    wheelDelta += event.deltaY;
    if (wheelDelta >= WHEEL_STEP) {
      wheelDelta = 0;
      goNext();
    } else if (wheelDelta <= -WHEEL_STEP) {
      wheelDelta = 0;
      goPrev();
    }
  }

  function onDocumentFocusIn(event: FocusEvent): void {
    if (destroyed) return;
    const path = event.composedPath();
    if (path.includes(host) || path.includes(overlay) || path.includes(shadowRoot)) {
      return;
    }
    overlay.focus();
  }

  return {
    setNavigator(next: Navigator) {
      navigator = next;
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("focusin", onDocumentFocusIn);
      document.documentElement.style.overflow = prevOverflow;
      shadowRoot.replaceChildren();
    },
  };
}

function applyAppearance(overlay: HTMLElement, settings: ReaderSettings): void {
  overlay.dataset.theme = settings.theme;
  overlay.dataset.type = settings.type;
}
