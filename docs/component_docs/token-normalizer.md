# Token Normalizer

## Scope

Normalize the raw token list by fusing fragments that form a single logical unit. Sits between the tokenizer and the segmenter. The tokenizer stays mechanical; the segmenter receives tokens that already represent correct units.

## Input

- Ordered token list from the tokenizer

## Output

- Ordered token list with merged entries (shorter or equal length)

## Features

- **Titles + name:** merge a title token (`Dr.`, `Mr.`, `Mrs.`, `Ms.`, `Prof.`) with the following capitalized name → `Dr. Smith`. If that name is followed by `Sr.` or `Jr.`, merge all three in the same step → `Dr. Smith Jr.`, `Mr. Jones Sr.`
- **Name + suffix:** merge a capitalized name with a following `Sr.` or `Jr.` even when there is no title → `Smith Jr.`, `Jones Sr.`
- `Sr.` and `Jr.` are suffixes, not titles: do not merge `Jr.` + `Smith`, or a title directly with a suffix (`Dr.` + `Jr.` has no name)
- **Time + meridiem:** merge a clock-time token (`12:00`, `3:30`) with a following `AM`, `am`, `PM`, `pm` (or `a.m.`, `p.m.`) → `12:00 PM`, `3:30pm`
- **Common abbreviations:** treat known abbreviations as one unit (`e.g.`, `i.e.`, `etc.`, `vs.`, `U.S.`, `U.K.`). If the tokenizer split them across adjacent tokens, merge with no extra space (`U.` + `S.` → `U.S.`). Leave them unchanged when they already arrived as one token
- Joined tokens keep a space between the original pieces unless the second piece was already attached (e.g. `3:30pm` arrived as one token from the tokenizer) or the join is an abbreviation (no space)
- Do not join when the next token is missing or does not match the expected pattern
- Single pass, left to right; a token consumed by a join is not available for the next rule
- English-only / English-first
- The list of join rules should be easy to extend without touching the tokenizer or segmenter
