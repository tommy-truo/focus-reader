# Segmenter

## Scope

Group tokens into display chunks. A chunk is the text shown on screen at one time. This stage does not split inside a token, does not fuse or rewrite tokens, and does not track which chunk the reader is on.

## Input

- Ordered normalized tokens from the Token Normalizer (already fused units such as `Dr. Smith` or `12:00 PM`)
- Captured text from the Capture stage (used so sentence and paragraph breaks match the selection)
- Locale (defaults to English)
- Chunking options: `auto` or `custom`, plus a word count for `custom`

## Output

- An ordered list of chunks (strings)
- An empty list when there are no tokens

## Features

- Treat each token as an opaque unit: count it, join it, or place a chunk boundary beside it — never inspect it for titles, names, numbers, times, or other inner structure
- **Auto mode:** split by document structure first (blank lines, list items, short headings), then by sentences, then by strong clause marks (`; : —`), then by clause commas that look like two clauses, then pack leftovers that are still too long
- **Custom mode:** dead simple — group every N tokens, no heuristics, no exceptions
- Keep short sentences and short clauses together (about 20 tokens or fewer)
- When packing a long leftover, aim near 12 tokens and avoid a tiny tail
- Do not split comma lists that are not two clauses
- English-only / English-first; other locales get structure and sentence splits only
- Join tokens with spaces when forming a chunk
