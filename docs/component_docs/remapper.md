# Remapper

## Scope

Keep the reader near the same place in the selection after chunks are rebuilt (for example when the user switches auto/custom or changes word count). This stage does not create tokens or chunks.

## Input

- Previous chunk list
- Previous chunk index (0-based)
- New chunk list

## Output

- A 0-based index into the new chunk list

## Features

- Measure progress as a running token count across chunks (whitespace-separated words)
- Place the new index on the chunk that covers the same token offset
- Clamp a bad previous index into range
- Return `0` when either list is empty
- Do not wrap past the last chunk
