# Navigator

## Scope

Track which chunk is currently shown. This stage does not know how tokens or chunks were formed, and it does not render UI.

## Input

- Ordered chunk list
- Optional starting index (0-based; defaults to 0)

## Output

- The current chunk string
- Current index, total count, and first/last flags
- `next` / `prev` move the index; they do not return a new list

## Features

- Index is 0-based
- First and last do not wrap
- Clamp a bad starting index into range
- Current chunk is an empty string when there are no chunks
- Treat an empty list as both first and last
