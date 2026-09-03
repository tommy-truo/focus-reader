# Focus Reader

Chrome extension that shows selected page text **one segment at a time** in a full-page overlay.

This file is for people working on the extension. Product intent, audience, and status live in [PROJECT.md](./PROJECT.md).

## Status

Focus Reader is **in active development**. It is not on the Chrome Web Store.

The repo currently holds product docs, architecture, and stage contracts. The WXT / TypeScript implementation is not in the tree yet; the steps below are the intended workflow once the package is scaffolded.

## Prerequisites

- [Node.js](https://nodejs.org/) LTS
- npm (bundled with Node)
- Chrome **120+** (Manifest V3 and `Intl.Segmenter`)

## Setup

```bash
npm install
npm run dev
```

Then load the unpacked extension in Chrome:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the WXT output folder (typically `.output/chrome-mv3`)

WXT rebuilds on save. If Chrome does not pick up a change, click **Reload** on the extension card, then refresh the page you are reading.

To try a session: select text on a normal webpage, then click the toolbar icon or right-click **Read with Focus Reader**. Restricted pages (Chrome Web Store, `chrome://` URLs, and similar) cannot host the overlay.

## Scripts

These match a standard WXT + Vitest project. Confirm names in `package.json` after scaffolding.

| Command | What it does |
|---|---|
| `npm run dev` | Dev build with HMR |
| `npm run build` | Production build |
| `npm run zip` | Zip for Chrome Web Store upload |
| `npm test` | Unit tests (pipeline first) |

## Layout

Source layers from [tech stack](./docs/tech-stack.md). Architecture runtime boundaries live in [architecture.md](./docs/architecture.md).

```
src/
  core/               # cleanser → navigator, settings types; no chrome, no DOM
  page/               # capture, reader view, session wiring; DOM only
  entrypoints/        # background + overlay content script; Chrome / WXT
docs/                 # architecture, stack, stage contracts
icons/
PROJECT.md
```

`core` imports nothing from `page` or `entrypoints`. `page` may import `core`, never Chrome. `entrypoints` may import both and is the only layer that uses `browser.*`.

Inject the overlay **on toolbar click or context menu**, not on every page load.

## Docs

- [PROJECT.md](./PROJECT.md) — what the product is and who it is for
- [Architecture](./docs/architecture.md) — pipeline, session flow, runtime boundaries
- [Tech stack](./docs/tech-stack.md) — TypeScript, WXT, Vitest, and why
- [Component contracts](./docs/component_docs/) — per-stage inputs, outputs, and must-nots

## License

[MIT](./LICENSE)
