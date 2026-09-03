import type { Navigator } from "../core/navigator";
import {
  clampFontSize,
  clampWordCount,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  isReaderFont,
  READER_FONTS,
  READER_FONT_STACKS,
  type ReaderFontWeight,
  type ReaderSettings,
  type ReaderTheme,
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
  let confettiTimer: ReturnType<typeof setTimeout> | undefined;

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
      <button type="button" class="fr-settings-toggle fr-icon-btn" aria-expanded="false" aria-controls="${settingsId}" aria-label="Settings">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96c-.5-.39-1.04-.7-1.63-.94l-.36-2.54a.49.49 0 0 0-.5-.42h-3.84a.49.49 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.4.31.6.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.25.42.5.42h3.84c.25 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/>
        </svg>
      </button>
      <button type="button" class="fr-close fr-icon-btn" aria-label="Close">&times;</button>
    </div>
    <form class="fr-settings" id="${settingsId}" hidden>
      <label class="fr-field">
        <span>Font</span>
        <select class="fr-font-select" name="font">
          ${READER_FONTS.map((font) => `<option value="${font}">${font}</option>`).join("")}
        </select>
      </label>
      <label class="fr-field">
        <span>Font size</span>
        <input class="fr-font-size" name="fontSize" type="number" min="${FONT_SIZE_MIN}" max="${FONT_SIZE_MAX}" step="1">
      </label>
      <div class="fr-field">
        <span id="${uid}-weight">Weight</span>
        <div class="fr-options" role="group" aria-labelledby="${uid}-weight">
          <label><input type="checkbox" name="fontWeight"> Bold</label>
        </div>
      </div>
      <div class="fr-field">
        <span id="${uid}-theme">Theme</span>
        <div class="fr-options" role="radiogroup" aria-labelledby="${uid}-theme">
          <label><input type="radio" name="theme" value="light"> Light</label>
          <label><input type="radio" name="theme" value="dark"> Dark</label>
          <label><input type="radio" name="theme" value="custom"> Custom</label>
        </div>
      </div>
      <div class="fr-custom-colors">
        <label class="fr-color-row">
          <span>Background Color</span>
          <input type="color" name="customBackground">
        </label>
        <label class="fr-color-row">
          <span>Text Color</span>
          <input type="color" name="customText">
        </label>
      </div>
      <div class="fr-field">
        <span id="${uid}-mode">Display mode</span>
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
      <div class="fr-end-mark" hidden>
        <span class="fr-end-label">End reached!</span>
        <button type="button" class="fr-confetti-btn" aria-label="Celebrate with confetti">
          <svg class="fr-confetti-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M2.8 21.2 9.1 8.6l6.2 5.1z"/>
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" d="M9.3 9.1c2.4-1.6 5.4-.6 7.1 1.4"/>
            <circle cx="15.2" cy="4.8" r="1.2" fill="#f2c14e"/>
            <circle cx="18.8" cy="7.4" r="1.1" fill="#e85d4c"/>
            <circle cx="20.4" cy="11.6" r="1" fill="#5aa9e6"/>
            <circle cx="13.4" cy="6.4" r="0.9" fill="#7bc77e"/>
            <circle cx="17.6" cy="14.2" r="0.9" fill="#c084fc"/>
            <path fill="none" stroke="#f2c14e" stroke-linecap="round" stroke-width="1.3" d="M12.4 3.6v2.3"/>
            <path fill="none" stroke="#e85d4c" stroke-linecap="round" stroke-width="1.3" d="M21.2 6.2h-2.2"/>
            <path fill="none" stroke="#5aa9e6" stroke-linecap="round" stroke-width="1.3" d="M20.2 13.6l1.8 1.4"/>
          </svg>
        </button>
      </div>
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
  const fontSelect = overlay.querySelector<HTMLSelectElement>(".fr-font-select")!;
  const fontSizeInput = overlay.querySelector<HTMLInputElement>(".fr-font-size")!;
  const fontWeightInput = overlay.querySelector<HTMLInputElement>(
    'input[name="fontWeight"]',
  )!;
  const customColors = overlay.querySelector<HTMLElement>(".fr-custom-colors")!;
  const customBackgroundInput = overlay.querySelector<HTMLInputElement>(
    'input[name="customBackground"]',
  )!;
  const customTextInput = overlay.querySelector<HTMLInputElement>(
    'input[name="customText"]',
  )!;

  syncSettingsForm();
  render();

  shadowRoot.replaceChildren(style, overlay);
  overlay.focus();

  overlay.addEventListener("keydown", onKeyDown);
  overlay.addEventListener("wheel", onWheel, { passive: false });
  overlay.addEventListener("click", onClick);
  settingsForm.addEventListener("change", onSettingsFormChange);
  settingsForm.addEventListener("input", onSettingsFormInput);
  document.addEventListener("focusin", onDocumentFocusIn);

  function emitSettings(): void {
    onSettingsChange({ ...settings });
  }

  function syncSettingsForm(): void {
    fontSelect.value = settings.font;
    fontSizeInput.value = String(settings.fontSize);
    fontWeightInput.checked = settings.fontWeight === "bold";
    const themeInput = settingsForm.querySelector<HTMLInputElement>(
      `input[name="theme"][value="${settings.theme}"]`,
    );
    const modeInput = settingsForm.querySelector<HTMLInputElement>(
      `input[name="chunkMode"][value="${settings.chunkMode}"]`,
    );
    if (themeInput) themeInput.checked = true;
    if (modeInput) modeInput.checked = true;
    wordCountInput.value = String(settings.wordCount);
    wordCountInput.disabled = settings.chunkMode !== "custom";
    customBackgroundInput.value = settings.customBackground;
    customTextInput.value = settings.customText;
    customColors.hidden = settings.theme !== "custom";
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
      return;
    }
    const popper = target.closest(".fr-confetti-btn");
    if (popper instanceof HTMLElement) {
      window.clearTimeout(confettiTimer);
      burstConfetti(overlay, popper, (id) => {
        confettiTimer = id;
      });
    }
  }

  function applyAppearanceAndEmit(): void {
    applyAppearance(overlay, settings);
    emitSettings();
  }

  function onSettingsFormInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name === "customBackground" || target.name === "customText") {
      applyColorSetting(target);
    }
  }

  function applyColorSetting(target: HTMLInputElement): void {
    if (target.name === "customBackground") {
      settings = { ...settings, customBackground: target.value };
    } else {
      settings = { ...settings, customText: target.value };
    }
    applyAppearanceAndEmit();
  }

  function onSettingsFormChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.name === "font") {
      if (!isReaderFont(target.value)) return;
      settings = { ...settings, font: target.value };
      applyAppearanceAndEmit();
      return;
    }
    if (!(target instanceof HTMLInputElement)) return;

    if (target.name === "fontSize") {
      settings = { ...settings, fontSize: clampFontSize(target.valueAsNumber) };
      fontSizeInput.value = String(settings.fontSize);
      applyAppearanceAndEmit();
      return;
    }
    if (target.name === "fontWeight") {
      const fontWeight: ReaderFontWeight = target.checked ? "bold" : "normal";
      settings = { ...settings, fontWeight };
      applyAppearanceAndEmit();
      return;
    }
    if (target.name === "theme") {
      settings = { ...settings, theme: target.value as ReaderTheme };
      customColors.hidden = settings.theme !== "custom";
      applyAppearanceAndEmit();
      return;
    }
    if (target.name === "customBackground" || target.name === "customText") {
      applyColorSetting(target);
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
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    );
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
      window.clearTimeout(confettiTimer);
      document.removeEventListener("focusin", onDocumentFocusIn);
      document.documentElement.style.overflow = prevOverflow;
      shadowRoot.replaceChildren();
    },
  };
}

const CONFETTI_COLORS = [
  "#e85d4c",
  "#f2c14e",
  "#7bc77e",
  "#5aa9e6",
  "#c084fc",
  "#f97316",
];

function burstConfetti(
  overlay: HTMLElement,
  origin: HTMLElement,
  onTimer: (id: ReturnType<typeof setTimeout>) => void,
): void {
  overlay.querySelector(".fr-confetti-layer")?.remove();

  const overlayRect = overlay.getBoundingClientRect();
  const originRect = origin.getBoundingClientRect();
  const originX = originRect.left + originRect.width / 2 - overlayRect.left;
  const originY = originRect.top + originRect.height / 2 - overlayRect.top;

  const layer = document.createElement("div");
  layer.className = "fr-confetti-layer";
  layer.setAttribute("aria-hidden", "true");

  const count = 36;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "fr-confetti-piece";
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 70 + Math.random() * 130;
    piece.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * dist - 36}px`);
    piece.style.setProperty("--rot", `${Math.random() * 640 - 320}deg`);
    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.width = `${5 + Math.random() * 5}px`;
    piece.style.height = `${8 + Math.random() * 6}px`;
    layer.append(piece);
  }

  overlay.append(layer);
  onTimer(window.setTimeout(() => layer.remove(), 1100));
}

function applyAppearance(overlay: HTMLElement, settings: ReaderSettings): void {
  overlay.dataset.theme = settings.theme;
  overlay.style.setProperty("--font", READER_FONT_STACKS[settings.font]);
  overlay.style.setProperty("--chunk-size", `${settings.fontSize}px`);
  overlay.style.setProperty(
    "--chunk-weight",
    settings.fontWeight === "bold" ? "700" : "400",
  );
  overlay.style.setProperty("--custom-bg", settings.customBackground);
  overlay.style.setProperty("--custom-text", settings.customText);
}
