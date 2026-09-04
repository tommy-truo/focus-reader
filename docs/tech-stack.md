# Tech stack

This document records **how** ReadVeil is built. The pipeline and session model are in [architecture.md](./architecture.md). Stage contracts are in [component_docs](./component_docs/).

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

**`chrome.storage.local`** keeps font, theme, and chunk settings on the device. Sync can wait.

**Vitest** fits a Vite-based WXT project. Most correctness lives in pure functions.

**Plain CSS** in the shadow root avoids host-page leakage. Themes are custom properties (`--bg`, `--text`, and similar). Tailwind is a poor fit for Shadow DOM.

## Source layout

Inject the overlay **on toolbar click or context menu**, not on every page. Typical permissions: `scripting`, `activeTab`, `contextMenus`, `storage`. Host permissions are stripped in `wxt.config.ts` so the overlay is injected only after a user gesture.

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
