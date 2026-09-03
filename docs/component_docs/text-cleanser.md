# Text Cleanser

## Scope

Normalize raw captured text before tokenization. Sits between Capture and the Tokenizer. This stage does not split, chunk, or display anything.

## Input

- Captured text (string) from the Capture stage

## Output

- A cleaned string ready for the Tokenizer
- An empty string when the input is empty or whitespace-only

## Features

- Trim leading and trailing whitespace
- Replace paragraph breaks, list breaks, and other newlines with a single space
- Collapse remaining runs of spaces and tabs into a single space
- Pass through all other content unchanged
