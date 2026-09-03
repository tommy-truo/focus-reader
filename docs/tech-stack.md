# Tech stack

This document records **how** Focus Reader is built. The pipeline and session model are in [architecture.md](./architecture.md). Stage contracts are in [component_docs](./component_docs/).

Stack choices should not leak into architecture. The overlay-and-pipeline design stays valid if the bundler changes; the reverse is not true.

## Why this is a separate doc

| Doc | Answers | Changes when |
|---|---|---|
| [PROJECT.md](../PROJECT.md) | What the product is and who it is for | Product intent changes |
| [architecture.md](./architecture.md) | How stages connect, what data moves, where code may run | Pipeline or session model changes |
| **This file** | Language, extension tooling, UI approach, tests | Implementation choices change |
| README (when present) | How to install, run, and load the unpacked extension | Scripts or setup steps change |

Putting WXT, Vite, or Vitest in architecture would mix a stable design with tooling that we may replace. Putting the stack rationale only in a README would bury the “why” under clone-and-run steps. README should link here and stay operational.

## Stack

| Layer | Choice |
|---|---|
| Platform | Chrome extension, Manifest V3 |
| Language | TypeScript |
| Extension framework | WXT (Vite) |
| Reader UI | Vanilla TypeScript + CSS in Shadow DOM |
| Pipeline | Pure TypeScript modules (no Chrome APIs) |
| Word/sentence splits | `Intl.Segmenter` (Chromium built-in) |
| Settings | `chrome.storage.local` |
| Tests | Vitest |
| Styles | Plain CSS + custom properties |
| Package manager | npm |

## Why these choices

**Manifest V3** is required for the Chrome Web Store. The reading surface is a content-script overlay, not a popup or side panel.

**TypeScript** matches the pipeline: string → tokens → chunks → index, with explicit stage inputs and outputs.

**WXT** handles the extension shell: service worker, toolbar and context menu, on-demand content-script injection, typed `browser` APIs, HMR, `createShadowRootUi`, and zip output for store upload. It does not require React.

**Vanilla Shadow DOM** matches the reader-view contract (render into a shadow root). The UI is one overlay, a place marker, prev/next, and a small settings panel. A UI framework would enlarge every page injection without helping capture, tokenization, or focus trapping.

**Pure pipeline modules** keep cleanser, tokenizer, normalizer, segmenter, remapper, and navigator testable without Chrome. They can be reused when a later feature (paste) is not a DOM selection.

**`Intl.Segmenter`** covers “split on word-like units, not whitespace alone” without an NLP library. Join rules and chunk heuristics stay in our code, as specified.

**`chrome.storage.local`** keeps type, theme, and chunk settings on the device. Sync can wait.

**Vitest** fits a Vite-based WXT project. Most correctness lives in pure functions.

**Plain CSS** in the shadow root avoids host-page leakage. Themes are custom properties (`--bg`, `--text`, and similar). Tailwind is a poor fit for Shadow DOM.

## What we are not using

- **React, Preact, Svelte** — too much for one overlay; they inflate the content-script bundle.
- **Lit** — the right upgrade if the settings panel grows (paste, speech). Do not start there.
- **Plasmo** — React-first and in maintenance mode.
- **CRXJS as the project framework** — a Vite plugin, not a greenfield default next to WXT.
- **A backend or hosted fonts/analytics** — conflicts with on-device processing.
- **Tokenizer libraries** (`compromise`, `wink`, and similar) — the English-first rules are explicit and owned by the normalizer and segmenter.

## Source layout

Inject the overlay **on toolbar click or context menu**, not on every page. Typical permissions: `scripting`, `activeTab`, `contextMenus`, `storage`.

The repo uses **three layers under `src/`**, matching the runtime boundaries in [architecture.md](./architecture.md). WXT’s `entrypoints/` directory lives inside `src/` (`srcDir: 'src'`).

```
src/
  core/            # no chrome, no DOM
  page/            # DOM and ShadowRoot; may import core
  entrypoints/     # Chrome / WXT only; may import page and core
```

| Folder | Holds | Must not |
|---|---|---|
| `src/core/` | Cleanser, tokenizer, normalizer, segmenter, remapper, navigator, settings *types and defaults* | Import `page`, `entrypoints`, `chrome` / `browser`, or the DOM |
| `src/page/` | Capture, reader view, session wiring (holds captured text, rebuilds chunks, mounts the overlay) | Import `entrypoints` or `chrome` / `browser` |
| `src/entrypoints/` | Background (icon, context menu, inject), overlay content script, `chrome.storage` adapter | Contain tokenizer / segmenter / navigator logic |

Dependency direction is one way: `core` ← `page` ← `entrypoints`.

A flatter layout (`src/pipeline`, `src/capture`, `src/reader`, `src/settings`, plus root `entrypoints/`) names stages clearly but hides the rules. Capture and reader view need the DOM, not Chrome. Settings *shape* is core data; persistence is an extension adapter. Putting `settings/` next to `pipeline/` makes it easy to pull `chrome.storage` into the tokenizer. Grouping by runtime makes that import illegal by location.

When files land:

- `src/entrypoints/background.ts` — toolbar, context menu, inject overlay
- `src/entrypoints/overlay.content.ts` — on-demand content script (`all_frames`); calls page, not core stages directly if a session helper exists
- Capture’s context-menu text is an optional `fallbackText: string` passed into `page`. Chrome collects it; capture does not import Chrome.
- Reader view persists settings through a callback. The content script writes `chrome.storage.local`.

- Target Chrome 120+ (`Intl.Segmenter` and MV3).
- Fonts: system stacks or bundled `.woff2` files — no CDN.
- Unit-test `src/core` first. Exercise capture across frames, inputs, and the context-menu fallback by hand.
