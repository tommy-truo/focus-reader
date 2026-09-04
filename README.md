# ReadVeil

Chrome extension that shows selected page text **one segment at a time** in a full-page overlay.

This file is for people working on the extension. Product intent, audience, and status live in [PROJECT.md](./PROJECT.md).

## Status

ReadVeil is **in active development**. It is not on the Chrome Web Store.

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
4. Select `.output/chrome-mv3-dev` (WXT's dev output). A production build (`npm run build`) writes `.output/chrome-mv3`.

WXT rebuilds on save. If Chrome does not pick up a change, click **Reload** on the extension card, then refresh the page you are reading.

To try a session: select text on a normal webpage, then click the toolbar icon or right-click **Read with ReadVeil**. Restricted pages (Chrome Web Store, `chrome://` URLs, and similar) cannot host the overlay.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev build with HMR (output in `.output/chrome-mv3-dev`) |
| `npm run build` | Production build (`.output/chrome-mv3`) |
| `npm run zip` | Zip for Chrome Web Store upload |
| `npm test` | Unit tests (Vitest) |

## Layout

Source layers from [tech stack](./docs/tech-stack.md). Architecture runtime boundaries live in [architecture.md](./docs/architecture.md).

```
src/
  core/               # cleanser → navigator, settings types; no chrome, no DOM
  page/               # capture, reader view, session wiring; DOM only
  entrypoints/        # background + overlay content script; Chrome / WXT
public/icons/         # toolbar icons copied into the packaged extension
store/                # Chrome Web Store promo tiles (not packaged)
docs/                 # architecture, stack, stage contracts, store listing
PROJECT.md
```

`core` imports nothing from `page` or `entrypoints`. `page` may import `core`, never Chrome. `entrypoints` may import both and is the only layer that uses `browser.*`.

Inject the overlay **on toolbar click or context menu**, not on every page load.

## Docs

- [PROJECT.md](./PROJECT.md) — what the product is and who it is for
- [Architecture](./docs/architecture.md) — pipeline, session flow, runtime boundaries
- [Tech stack](./docs/tech-stack.md) — TypeScript, WXT, Vitest, and why
- [Component contracts](./docs/component_docs/) — per-stage inputs, outputs, and must-nots
- [Chrome Web Store listing](./docs/chrome-web-store.md) — paste-ready store copy and remaining upload steps
- [Privacy policy](./docs/privacy-policy.md)

## License

[MIT](./LICENSE)
