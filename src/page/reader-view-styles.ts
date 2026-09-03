export const READER_VIEW_CSS = `
:host {
  all: initial;
}

.fr-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 1.25rem 1.5rem 1.5rem;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 1.25rem;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.fr-overlay[data-theme="light"] {
  --bg: #f6f4ef;
  --text: #1c1b19;
  --muted: #5c5a55;
  --line: #d9d4c8;
  --focus: #2b5d8a;
  --btn-bg: #ece8de;
}

.fr-overlay[data-theme="dark"] {
  --bg: #161718;
  --text: #ececec;
  --muted: #9a9c9f;
  --line: #2e3033;
  --focus: #8cb4d9;
  --btn-bg: #242628;
}

.fr-overlay[data-theme="custom"] {
  --bg: var(--custom-bg);
  --text: var(--custom-text);
  --muted: color-mix(in srgb, var(--text) 65%, var(--bg));
  --line: color-mix(in srgb, var(--text) 22%, var(--bg));
  --focus: color-mix(in srgb, var(--text) 80%, var(--bg));
  --btn-bg: color-mix(in srgb, var(--text) 12%, var(--bg));
}

.fr-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.fr-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  min-height: 0;
  padding: 2rem 1rem;
}

.fr-chunk {
  margin: 0;
  max-width: 38rem;
  text-align: center;
  font-size: var(--chunk-size);
  font-weight: var(--chunk-weight);
}

.fr-end-mark {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--text);
  opacity: 0.55;
}

.fr-end-mark[hidden],
.fr-settings[hidden],
.fr-custom-colors[hidden] {
  display: none;
}

.fr-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  flex-shrink: 0;
}

.fr-place {
  color: var(--muted);
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  min-width: 5.5rem;
  text-align: center;
}

.fr-settings {
  margin: 1rem 0 0;
  padding: 1rem 1.1rem;
  border: 1px solid var(--line);
  border-radius: 0.6rem;
  background: color-mix(in srgb, var(--btn-bg) 70%, var(--bg));
  display: grid;
  gap: 0.85rem;
  max-width: 28rem;
}

.fr-field {
  display: grid;
  gap: 0.35rem;
}

.fr-field > span,
.fr-settings legend {
  color: var(--muted);
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.fr-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1rem;
}

.fr-options label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 1rem;
}

.fr-word-count,
.fr-font-size,
.fr-font-select {
  width: 4.5rem;
  padding: 0.3rem 0.4rem;
  border: 1px solid var(--line);
  border-radius: 0.35rem;
  background: var(--bg);
  color: var(--text);
  font: inherit;
}

.fr-font-select {
  width: 100%;
  max-width: 16rem;
}

.fr-custom-colors {
  display: grid;
  gap: 0.85rem;
}

.fr-color-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.fr-color-row span {
  color: var(--muted);
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.fr-color-row input[type="color"] {
  width: 2.5rem;
  height: 1.75rem;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 0.35rem;
  background: var(--bg);
  cursor: pointer;
}

button {
  font: inherit;
  color: var(--text);
  background: var(--btn-bg);
  border: 1px solid var(--line);
  border-radius: 0.45rem;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
}

button:disabled {
  opacity: 0.4;
  cursor: default;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
.fr-overlay:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}

.fr-icon-btn {
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  line-height: 1;
}
`;
