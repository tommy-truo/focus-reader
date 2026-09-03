# Architecture

Focus Reader turns a page selection into a sequence of reading chunks, then shows one chunk at a time in a full-page overlay. This document describes that pipeline, how a reading session runs, and where each stage lives. Stage contracts are in [component_docs](./component_docs/). Implementation choices (language, bundler, tests) are in [tech-stack.md](./tech-stack.md).

## Pipeline

The overlay is the product. Capture, processing, and display all happen on the device. Nothing in this pipeline calls a remote service.

```
User selects text
        │
        ▼
   ┌─────────┐
   │ Capture │  page selection → one string
   └────┬────┘     (keeps paragraph and list breaks)
        │
        │ captured text ─────────────────────────────────┐
        ▼                                                │
   ┌──────────────┐                                      │
   │ Text Cleanser│  flatten whitespace                  │
   └──────┬───────┘                                      │
          │ cleansed text                                │
          ▼                                              │
   ┌───────────┐                                         │
   │ Tokenizer │  string → atomic tokens                 │
   └─────┬─────┘                                         │
         │ tokens                                        │
         ▼                                               │
   ┌──────────────────┐                                  │
   │ Token Normalizer │  fuse names, times, abbrevs      │
   └────────┬─────────┘                                  │
            │ normalized tokens                          │ original formatting
            └────────────────────┬───────────────────────┘
                                 ▼
                          ┌───────────┐
                          │ Segmenter │  two inputs → chunks
                          └─────┬─────┘
                                │ chunks
                                ▼
                          ┌───────────┐
                          │ Navigator │
                          └─────┬─────┘
                                ▼
                          ┌─────────────┐
                          │ Reader view │
                          └─────────────┘
```

Capture’s string is stored and then **forks**. The cleanser → tokenizer → normalizer path produces the units the segmenter may count or join. The captured string itself is passed through unchanged so the segmenter can still see the original breaks. The cleanser destroys those breaks on purpose (newlines become spaces), so they cannot be recovered from tokens.

[Remapper](./component_docs/remapper.md) is not on the first-pass path. It runs when chunks are rebuilt mid-session (chunk mode or word count changes) so the reader stays near the same place in the selection.

## Session flow

1. The user selects text on a page, then clicks the toolbar icon or chooses **Read with Focus Reader** from the context menu.
2. If the page is restricted, the selection is empty, or the text is over the size limit, the session does not start.
3. Capture produces a single string. Live DOM selection wins over the context-menu fallback. Across frames, the longest reachable selection wins.
4. The captured string is stored. One copy runs through cleanser → tokenizer → normalizer. The segmenter then receives **both** that normalized token list **and** the original captured string.
5. A navigator is created on the resulting chunk list (index `0`).
6. Reader view mounts into a shadow root, covers the page, and shows the current chunk.
7. Previous / next (buttons, arrows, wheel) move the navigator index. The chunk list does not change.
8. If the user changes chunk mode or word count, the session **rebuilds from the stored captured text**: cleanser through segmenter run again, remapper picks a new index, a new navigator is supplied, and reader view refreshes without recapturing.
9. Type and theme changes restyle the overlay immediately; they do not rebuild chunks.
10. Escape closes the settings panel if it is open, otherwise it ends the session and removes the overlay.

Paste and speech, when added, should feed the same overlay and the same pipeline after Capture — not a second UI.

## Stages

Each stage has one job. Downstream stages must not redo upstream work.

| Stage | Input | Output | Must not |
|---|---|---|---|
| [Capture](./component_docs/capture.md) | Page selection (DOM, inputs, optional context-menu text) | One string, or empty | Tokenize, chunk, display, or enrich with nearby headings |
| [Text Cleanser](./component_docs/text-cleanser.md) | Captured string | Flattened string | Split into tokens or chunks |
| [Tokenizer](./component_docs/tokenizer.md) | Cleansed string + locale | Ordered atomic tokens | Decide which tokens appear together on screen |
| [Token Normalizer](./component_docs/token-normalizer.md) | Token list | Shorter or equal token list | Chunk for display |
| [Segmenter](./component_docs/segmenter.md) | Normalized tokens, captured text, locale, chunk options | Ordered chunk strings | Split inside a token, fuse tokens, or track the current chunk |
| [Remapper](./component_docs/remapper.md) | Old chunks + old index + new chunks | New 0-based index | Create tokens or chunks |
| [Navigator](./component_docs/navigator.md) | Chunk list + optional start index | Current chunk, index, first/last; `next` / `prev` | Know how chunks were formed, or render |
| [Reader view](./component_docs/reader-view.md) | Shadow root, navigator, settings, close/persist callbacks | On-screen overlay | Capture, tokenize, or chunk |

### Capture → cleanser → tokens

Capture returns exactly what was highlighted, including paragraph and list breaks when the selection crosses blocks. That string is the session’s source of truth. It is stored for rebuilds and is also an input to the segmenter.

The cleanser then trims, turns those breaks into single spaces, and collapses space/tab runs. That flattening is required so the tokenizer can split a single linear string. The tokenizer never sees layout — only the cleansed string — and splits it into word-like units. Punctuation stays attached (`Hello,`, `"Hello,"`). Numerics with internal punctuation stay one token (`1,000`, `12:00`, `3:30pm`).

The tokenizer is mechanical. It does not know that `Dr.` + `Smith` is a name, or that `Jr.` belongs with that name. The normalizer fuses those fragments (title + name, name + `Sr.`/`Jr.`, time + meridiem, common abbreviations) in one left-to-right pass. Join rules should be extendable without changing the tokenizer or segmenter.

### Segmenter inputs

The segmenter is the first stage that needs **two** views of the same selection:

| Input | From | Role |
|---|---|---|
| Normalized tokens | Token Normalizer | Opaque units to count, join with spaces, or place a chunk boundary beside. Already fused (`Dr. Smith`, `Dr. Smith Jr.`, `Smith Jr.`, `12:00 PM`). The segmenter must not split inside a token or inspect it for titles, numbers, or times. |
| Captured text | Capture (not the cleanser) | Original formatting: paragraph breaks, list breaks, and other newlines as they were highlighted. Used so auto-mode structure and sentence splits follow the selection. |
| Locale | Session (default English) | English-first heuristics; other locales get structure and sentence splits only. |
| Chunk options | Settings | `auto` or `custom`, plus a word count for `custom`. |

The two text paths are not interchangeable. After the cleanser, a blank line between paragraphs and a single space between words look the same. Tokens therefore cannot tell the segmenter where a list item or short heading ended. Capture still has those breaks, so auto mode can split by document structure first (blank lines, list items, short headings), then by sentences, then by strong clause marks, then by clause-like commas, then pack leftovers that are still long.

Custom mode ignores that formatting and groups every N tokens. The captured string is still passed in so the segmenter’s input shape does not change with mode.

```
Token Normalizer ──► normalized tokens ──┐
                                         ├──► Segmenter ──► chunks
Capture ──────────► captured text ───────┘
                    (paragraph / list breaks intact)
```

Join rules stay in the normalizer. Chunk boundaries stay in the segmenter. Short sentences and clauses (about 20 tokens or fewer) stay together. Long leftovers aim near 12 tokens and avoid a tiny tail.

v1 is English-first. Scripts that do not separate words with spaces may chunk poorly.

### Remapper, navigator, reader view

Navigator holds *where* the reader is. Remapper answers *where that should be* after a rebuild. Reader view is the only stage that draws.

Rebuild path:

```
stored captured text + new chunk options
        │
        ├──────────────────────────────┐
        ▼                              │
cleanser → tokenizer → normalizer      │
        │                              │
        │ normalized tokens            │ captured text (same string)
        └──────────────┬───────────────┘
                       ▼
                  Segmenter
                       │
                       ▼
                  new chunk list
                       │
                       ▼
        Remapper(old chunks, old index, new chunks) → new index
                       │
                       ▼
        new Navigator(new chunks, new index)
                       │
                       ▼
        Reader view refreshes (no recapture)
```

Progress is a running token count across chunks (whitespace-separated words), not a string offset and not a percentage of chunk count. A bad index is clamped. Empty lists map to index `0`. The index does not wrap.

Reader view shows one chunk, `n / total`, previous/next, settings, and close. It traps focus, announces the current chunk, and applies type/theme immediately. Previous is disabled on the first chunk; next is disabled on the last, which also shows an end mark.

## Runtime boundaries

These boundaries matter more than folder names. The source folders that enforce them (`src/core`, `src/page`, `src/entrypoints`) are in [tech-stack.md](./tech-stack.md).

| Code | Needs | Examples |
|---|---|---|
| Extension shell | Toolbar click, context menu, injecting the overlay into the active tab | Start/stop a session |
| Capture | Live DOM, reachable iframes, focused inputs, optional `selectionText` | One string |
| Pipeline | No Chrome APIs, no DOM | Cleanser, tokenizer, normalizer, segmenter, remapper, navigator |
| Reader view | A shadow root on the page, navigator, settings | Overlay UI |

The pipeline should stay pure so it can be reused when Capture is not a page selection (for example paste). Reader view should not import tokenizer or segmenter. Capture should not know about chunks.

Settings that change chunking (mode, word count) retrigger the pipeline from stored captured text. Settings that only change appearance (type, theme) do not.

## Data in a session

A running session needs at least:

- The captured text string (kept for rebuilds and passed to the segmenter for original formatting)
- Locale (default English)
- Chunk options (`auto` or `custom`, plus word count for `custom`)
- Current chunk list
- Navigator index
- Appearance settings (type, theme)

Captured text is the source of truth for rebuilds. The live page selection is not consulted again until the user starts a new session.

## What this architecture is not

- Not a sidebar, side panel, or popup reader. Those can launch a session; they are not the reading surface.
- Not a medical device.
- Not a server-side NLP service. Text stays on the device.
- Not a heading-recovery or article-extraction tool. Capture does not enrich the selection.
