# Focus Reader

**Focus Reader** is a Chrome browser extension that helps people read dense web content in small, manageable chunks. It presents selected text in a simplified, low-clutter view so reading feels easier and less overwhelming.

## The Problem

Long paragraphs and dense pages ask a lot of working memory at once. When too much text is visible, it becomes harder to stay focused, follow along, and finish what you started. That friction affects anyone reading under stress, fatigue, or time pressure.

## What Focus Reader Does

Select text on a webpage, then click the **Focus Reader** toolbar icon or right-click and choose **Read with Focus Reader** to read that selection one segment at a time — instead of as a wall of text. Focus Reader **covers the page** with a distraction-free overlay so ads, links, and motion are not in view. That overlay **is the product**, not a sidebar or side panel. Cookie banners, fullscreen video, and some page dialogs can still appear on top. The reader interface stays calm and minimal.

v1 works best with **languages that separate words with spaces** (for example English). Writing systems that do not use spaces between words may chunk poorly.

## Who It's For

Focus Reader is for readers who want **focus-friendly, low-clutter reading** of dense pages — anyone who finds a full screen of text hard to start or finish.

Focus Reader is a **reading display**, not a medical device or treatment. It does not diagnose or treat any condition.

## What We Aim For

- **Less clutter** — show only the current segment in a full-page overlay; cover the rest of the page when the browser allows it
- **Low friction** — get from dense text to focused reading quickly, without a complicated setup
- **A calm experience** — predictable, quiet interaction that supports concentration rather than competing with it
- **Room to grow** — richer reading features (paste, speech) on the **same overlay**, not a sidebar

## Status

Focus Reader is **in active development**. The first release is not yet available on the Chrome Web Store.

## Availability

When Focus Reader is ready, it will be installable from the **Chrome Web Store**. Until then, there is no public release to download.

## Docs

- [Architecture](./docs/architecture.md) — reading pipeline and session model
- [Tech stack](./docs/tech-stack.md) — language, tooling, and why
- [Component contracts](./docs/component_docs/) — per-stage scope, inputs, and outputs
- [README](./README.md) — setup for developers working on the extension

## Privacy

Your selected text is processed **on your device** to display reading segments. Focus Reader does not send your reading text to external servers. See the [privacy policy](./docs/privacy-policy.md) for details.
