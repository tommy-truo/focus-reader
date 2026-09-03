# Capture

## Scope

Turn the user's current page selection into a single text string for the rest of the pipeline. This stage does not tokenize, chunk, or display anything.

## Input

- The active tab's document selection (including text in iframes when reachable)
- Selected text inside a focused input or textarea, when that is the user's selection
- Optional context-menu selection text, used only if DOM capture is empty

## Output

- A single string of selected text
- An empty string when there is no usable selection

## Features

- Return exactly what was highlighted — no heading recovery, no nearby-title prepending, no enrichment
- Prefer the live DOM selection over the context-menu fallback
- Across frames, keep the longest captured selection
- Preserve paragraph and list breaks when the selection crosses block elements
- Read highlighted ranges inside form fields
- Reject or stop before this stage when the page is restricted, the selection is empty, or the text is over the size limit
