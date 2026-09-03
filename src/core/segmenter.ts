export type ChunkMode = "auto" | "custom";

export type ChunkOptions = {
  mode: ChunkMode;
  /** Token count per chunk when `mode` is `custom`. Ignored in `auto`. */
  wordCount?: number;
};

const SHORT_THRESHOLD = 20;
const PACK_TARGET = 12;
const PACK_MIN = 8;

const DEPENDENT_CLAUSE_STARTERS = new Set([
  "Although",
  "Though",
  "While",
  "When",
  "If",
  "Because",
  "Since",
  "Unless",
  "Until",
  "Before",
  "After",
  "Once",
  "Whereas",
]);

type TokenRange = { start: number; end: number };

/**
 * Group normalized tokens into display chunks.
 * Locale defaults to English. Options default to auto mode.
 */
export function segment(
  tokens: readonly string[],
  capturedText: string,
  locale = "en",
  options: ChunkOptions = { mode: "auto" },
): string[] {
  if (tokens.length === 0) {
    return [];
  }

  if (options.mode === "custom") {
    return segmentCustom(tokens, options.wordCount ?? 1);
  }

  return segmentAuto(tokens, capturedText, isEnglishLocale(locale));
}

function isEnglishLocale(locale: string): boolean {
  return locale === "en" || locale.startsWith("en-");
}

function joinTokens(tokens: readonly string[], start: number, end: number): string {
  return tokens.slice(start, end).join(" ");
}

function segmentCustom(tokens: readonly string[], wordCount: number): string[] {
  const size = Math.max(1, wordCount);
  const chunks: string[] = [];

  for (let i = 0; i < tokens.length; i += size) {
    chunks.push(joinTokens(tokens, i, Math.min(i + size, tokens.length)));
  }

  return chunks;
}

function segmentAuto(
  tokens: readonly string[],
  capturedText: string,
  english: boolean,
): string[] {
  const spans = alignTokens(tokens, capturedText);
  const sections = splitByStructure(tokens, capturedText, spans);
  const chunks: string[] = [];

  for (const section of sections) {
    chunks.push(...processSection(tokens, section, capturedText, spans, english));
  }

  return chunks;
}

function processSection(
  tokens: readonly string[],
  section: TokenRange,
  capturedText: string,
  spans: readonly TokenSpan[],
  english: boolean,
): string[] {
  const sentences = splitAtSentenceBoundaries(tokens, section.start, section.end);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    const length = sentence.end - sentence.start;
    if (length <= SHORT_THRESHOLD) {
      chunks.push(joinTokens(tokens, sentence.start, sentence.end));
      continue;
    }

    if (!english) {
      chunks.push(joinTokens(tokens, sentence.start, sentence.end));
      continue;
    }

    chunks.push(
      ...splitLongSegment(tokens, sentence, capturedText, spans),
    );
  }

  return chunks;
}

function splitLongSegment(
  tokens: readonly string[],
  range: TokenRange,
  capturedText: string,
  spans: readonly TokenSpan[],
): string[] {
  let ranges = [range];

  ranges = splitRangesOnPredicate(ranges, (index) =>
    endsWithStrongClauseMark(tokens[index]),
  );
  ranges = splitRangesOnEmDash(ranges, spans, capturedText);
  ranges = splitRangesOnPredicate(ranges, (index) =>
    isClauseCommaBoundary(tokens, ranges, index),
  );

  const chunks: string[] = [];
  for (const subRange of ranges) {
    const length = subRange.end - subRange.start;
    if (length <= SHORT_THRESHOLD) {
      chunks.push(joinTokens(tokens, subRange.start, subRange.end));
    } else {
      chunks.push(...packTokens(tokens, subRange.start, subRange.end));
    }
  }

  return chunks;
}

function endsWithStrongClauseMark(token: string): boolean {
  return token.endsWith(";") || token.endsWith(":");
}

function isClauseCommaBoundary(
  tokens: readonly string[],
  ranges: readonly TokenRange[],
  tokenIndex: number,
): boolean {
  const range = ranges.find(
    (candidate) => tokenIndex >= candidate.start && tokenIndex < candidate.end,
  );
  if (!range) {
    return false;
  }

  const token = tokens[tokenIndex];
  if (!token.endsWith(",")) {
    return false;
  }

  if (!DEPENDENT_CLAUSE_STARTERS.has(tokens[range.start])) {
    return false;
  }

  const leftLength = tokenIndex - range.start + 1;
  const rightLength = range.end - tokenIndex - 1;
  return leftLength >= 5 && rightLength >= 5;
}

function splitRangesOnPredicate(
  ranges: readonly TokenRange[],
  shouldSplitAfter: (tokenIndex: number) => boolean,
): TokenRange[] {
  const result: TokenRange[] = [];

  for (const range of ranges) {
    let subStart = range.start;

    for (let index = range.start; index < range.end; index++) {
      if (shouldSplitAfter(index) && index + 1 < range.end) {
        result.push({ start: subStart, end: index + 1 });
        subStart = index + 1;
      }
    }

    if (subStart < range.end) {
      result.push({ start: subStart, end: range.end });
    }
  }

  return result;
}

function splitRangesOnEmDash(
  ranges: readonly TokenRange[],
  spans: readonly TokenSpan[],
  capturedText: string,
): TokenRange[] {
  const result: TokenRange[] = [];

  for (const range of ranges) {
    let subStart = range.start;

    for (let index = range.start; index < range.end - 1; index++) {
      if (hasEmDashBetween(capturedText, spans[index].end, spans[index + 1].start)) {
        result.push({ start: subStart, end: index + 1 });
        subStart = index + 1;
      }
    }

    if (subStart < range.end) {
      result.push({ start: subStart, end: range.end });
    }
  }

  return result;
}

function hasEmDashBetween(capturedText: string, from: number, to: number): boolean {
  return /—|--/.test(capturedText.slice(from, to));
}

function splitAtSentenceBoundaries(
  tokens: readonly string[],
  start: number,
  end: number,
): TokenRange[] {
  const sentences: TokenRange[] = [];
  let sentenceStart = start;

  for (let index = start; index < end; index++) {
    const nextToken = index + 1 < end ? tokens[index + 1] : undefined;
    if (isSentenceEnd(tokens[index], nextToken)) {
      sentences.push({ start: sentenceStart, end: index + 1 });
      sentenceStart = index + 1;
    }
  }

  if (sentenceStart < end) {
    sentences.push({ start: sentenceStart, end });
  }

  return sentences;
}

function isSentenceEnd(token: string, nextToken?: string): boolean {
  if (token.endsWith("?") || token.endsWith("!")) {
    return true;
  }

  if (token.endsWith("...")) {
    return true;
  }

  if (token.endsWith(".")) {
    if (nextToken !== undefined && /^[a-z]/.test(nextToken)) {
      return false;
    }
    return true;
  }

  return false;
}

function packTokens(
  tokens: readonly string[],
  start: number,
  end: number,
): string[] {
  const total = end - start;
  if (total <= SHORT_THRESHOLD) {
    return [joinTokens(tokens, start, end)];
  }

  const sizes = planPackSizes(total);
  const chunks: string[] = [];
  let offset = start;

  for (const size of sizes) {
    chunks.push(joinTokens(tokens, offset, offset + size));
    offset += size;
  }

  return chunks;
}

function planPackSizes(total: number): number[] {
  if (total <= SHORT_THRESHOLD) {
    return [total];
  }

  const sizes: number[] = [];
  let remaining = total;

  while (remaining > SHORT_THRESHOLD) {
    let size = PACK_TARGET;
    const tail = remaining - size;

    if (tail > 0 && tail < PACK_MIN) {
      size = remaining - PACK_MIN;
    }

    sizes.push(size);
    remaining -= size;
  }

  if (remaining > 0) {
    sizes.push(remaining);
  }

  return sizes;
}

type TokenSpan = { start: number; end: number };

function alignTokens(
  tokens: readonly string[],
  capturedText: string,
): TokenSpan[] {
  const spans: TokenSpan[] = [];
  let position = 0;

  for (const token of tokens) {
    position = skipIgnorable(capturedText, position);
    const start = position;

    for (const character of token) {
      while (position < capturedText.length && /\s/.test(capturedText[position])) {
        position++;
      }

      if (position < capturedText.length && capturedText[position] === character) {
        position++;
      }
    }

    spans.push({ start, end: position });
  }

  return spans;
}

function skipIgnorable(text: string, position: number): number {
  while (position < text.length) {
    if (/[\s\u2028\u2029]/.test(text[position])) {
      position++;
      continue;
    }

    const rest = text.slice(position);
    const bulletMatch = rest.match(/^[-*•]\s+/);
    if (bulletMatch) {
      position += bulletMatch[0].length;
      continue;
    }

    const numberedMatch = rest.match(/^\d+[.)]\s+/);
    if (numberedMatch) {
      position += numberedMatch[0].length;
      continue;
    }

    break;
  }

  return position;
}

function findStructuralBreakPositions(capturedText: string): number[] {
  const positions = new Set<number>();

  for (const match of capturedText.matchAll(/\n[\t ]*\n+/g)) {
    positions.add(match.index! + match[0].length);
  }

  for (const match of capturedText.matchAll(/\n[\t ]*(?:[-*•]|\d+[.)])\s+/g)) {
    positions.add(match.index! + match[0].length);
  }

  return [...positions].sort((left, right) => left - right);
}

function positionToTokenIndex(position: number, spans: readonly TokenSpan[]): number {
  for (let index = 0; index < spans.length; index++) {
    if (position <= spans[index].start) {
      return index;
    }
  }

  return spans.length;
}

function splitByStructure(
  tokens: readonly string[],
  capturedText: string,
  spans: readonly TokenSpan[],
): TokenRange[] {
  const breakIndices = new Set<number>([0]);

  for (const position of findStructuralBreakPositions(capturedText)) {
    const tokenIndex = positionToTokenIndex(position, spans);
    if (tokenIndex < tokens.length) {
      breakIndices.add(tokenIndex);
    }
  }

  const sortedBreaks = [...breakIndices].sort((left, right) => left - right);
  const sections: TokenRange[] = [];

  for (let index = 0; index < sortedBreaks.length; index++) {
    const start = sortedBreaks[index];
    const end =
      index + 1 < sortedBreaks.length ? sortedBreaks[index + 1] : tokens.length;

    if (start < end) {
      sections.push({ start, end });
    }
  }

  return sections;
}
