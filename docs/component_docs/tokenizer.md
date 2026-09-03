# Tokenizer

## Scope

Split cleansed text into an ordered list of atomic tokens. A token is the smallest unit later stages may count or join, but must not split. This stage does not decide which tokens appear together on screen.

## Input

- Cleansed text (string) from the Text Cleanser
- Locale (defaults to English)

## Output

- An ordered list of tokens (strings)
- An empty list when the text is empty or whitespace-only

## Features

- Split on word-like units, not by whitespace alone
- Attach punctuation to the neighboring word (`Hello,` stays one token; `"Hello,"` stays one token)
- Drop pure-whitespace pieces
- Keep any numeric with internal punctuation as one token (`1,000`, `12:00`, `3:30pm`, `1.5`)
- English-only / English-first
- Work best for scripts that separate words with spaces
