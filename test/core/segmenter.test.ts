import { describe, expect, it } from "vitest";
import { segment } from "../../src/core/segmenter";
import { normalizeTokens } from "../../src/core/token-normalizer";
import { tokenize } from "../../src/core/tokenizer";

const AUTO = { mode: "auto" as const };
const custom = (wordCount: number) => ({ mode: "custom" as const, wordCount });

function words(count: number, prefix = "w"): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);
}

function tokenSizes(chunks: readonly string[], tokens: readonly string[]): number[] {
  let index = 0;
  return chunks.map((chunk) => {
    let used = 0;
    let text = "";
    while (index < tokens.length) {
      text = text === "" ? tokens[index] : `${text} ${tokens[index]}`;
      used++;
      index++;
      if (text === chunk) {
        return used;
      }
    }
    throw new Error(`chunk ${JSON.stringify(chunk)} does not match the token list`);
  });
}

function expectChunksCoverTokens(
  chunks: readonly string[],
  tokens: readonly string[],
): void {
  expect(chunks.join(" ")).toBe(tokens.join(" "));
}

describe("segment", () => {
  describe("empty input", () => {
    it("returns an empty list when there are no tokens", () => {
      expect(segment([], "", "en", AUTO)).toEqual([]);
      expect(segment([], "kept capture", "en", AUTO)).toEqual([]);
      expect(segment([], "kept capture", "en", custom(3))).toEqual([]);
    });
  });

  describe("chunk strings", () => {
    it("joins tokens with a single space", () => {
      expect(segment(["Hello", "world"], "Hello world", "en", AUTO)).toEqual([
        "Hello world",
      ]);
    });

    it("forms chunks from tokens, not from extra spaces in captured text", () => {
      expect(
        segment(["Hello,", "world"], "Hello,  world", "en", AUTO),
      ).toEqual(["Hello, world"]);
    });

    it("does not rewrite token text", () => {
      expect(segment(["Hello,", "world!"], "Hello, world!", "en", AUTO)).toEqual(
        ["Hello, world!"],
      );
    });
  });

  describe("opaque tokens", () => {
    it("does not split inside a fused title+name token", () => {
      const tokens = ["Meet", "Dr. Smith", "today."];
      const chunks = segment(tokens, "Meet Dr. Smith today.", "en", AUTO);
      expectChunksCoverTokens(chunks, tokens);
      expect(chunks.some((chunk) => chunk.includes("Dr. Smith"))).toBe(true);
      expect(chunks.join(" ")).not.toMatch(/Dr\.(?! Smith)/);
    });

    it("counts a fused token as one unit in custom mode", () => {
      expect(
        segment(
          ["Dr. Smith Jr.", "arrived", "at", "12:00 PM"],
          "Dr. Smith Jr. arrived at 12:00 PM",
          "en",
          custom(2),
        ),
      ).toEqual(["Dr. Smith Jr. arrived", "at 12:00 PM"]);
    });

    it("does not split inside a fused time or abbreviation", () => {
      const tokens = ["Visit", "the", "U.S.", "at", "12:00 PM."];
      const chunks = segment(
        tokens,
        "Visit the U.S. at 12:00 PM.",
        "en",
        custom(1),
      );
      expect(chunks).toEqual(["Visit", "the", "U.S.", "at", "12:00 PM."]);
    });
  });

  describe("custom mode", () => {
    it("groups every N tokens with no leftover empty chunk", () => {
      const tokens = ["a", "b", "c", "d", "e"];
      expect(segment(tokens, "a b c d e", "en", custom(2))).toEqual([
        "a b",
        "c d",
        "e",
      ]);
    });

    it("returns one chunk when N is greater than the token count", () => {
      expect(segment(["a", "b", "c"], "a b c", "en", custom(10))).toEqual([
        "a b c",
      ]);
    });

    it("returns one chunk when N equals the token count", () => {
      expect(segment(["a", "b", "c"], "a b c", "en", custom(3))).toEqual([
        "a b c",
      ]);
    });

    it("puts each token in its own chunk when N is 1", () => {
      expect(segment(["a", "b", "c"], "a b c", "en", custom(1))).toEqual([
        "a",
        "b",
        "c",
      ]);
    });

    it("ignores paragraph and list breaks in captured text", () => {
      const tokens = ["First", "line.", "Second", "line."];
      const captured = "First line.\n\n- Second line.";
      expect(segment(tokens, captured, "en", custom(3))).toEqual([
        "First line. Second",
        "line.",
      ]);
    });

    it("ignores sentence punctuation when grouping", () => {
      const tokens = ["The", "cat", "sat.", "The", "dog", "ran."];
      expect(segment(tokens, tokens.join(" "), "en", custom(4))).toEqual([
        "The cat sat. The",
        "dog ran.",
      ]);
    });
  });

  describe("auto mode: structure", () => {
    it("splits on a blank line between paragraphs before other rules", () => {
      const tokens = ["A", "short", "label", "Then", "a", "full", "sentence."];
      const captured = "A short label\n\nThen a full sentence.";
      expect(segment(tokens, captured, "en", AUTO)).toEqual([
        "A short label",
        "Then a full sentence.",
      ]);
    });

    it("splits list items using captured line breaks, even when markers never became tokens", () => {
      const tokens = ["apples", "oranges", "bananas"];
      const captured = "- apples\n- oranges\n- bananas";
      expect(segment(tokens, captured, "en", AUTO)).toEqual([
        "apples",
        "oranges",
        "bananas",
      ]);
    });

    it("splits a short heading from the paragraph that follows a blank line", () => {
      const body = words(8, "body");
      body[body.length - 1] = `${body[body.length - 1]}.`;
      const tokens = ["Overview", ...body];
      const captured = `Overview\n\n${body.join(" ")}`;
      expect(segment(tokens, captured, "en", AUTO)[0]).toBe("Overview");
      expectChunksCoverTokens(segment(tokens, captured, "en", AUTO), tokens);
    });

    it("splits sentences inside each paragraph after structure splits", () => {
      const tokens = ["One.", "Two.", "Three.", "Four."];
      const captured = "One. Two.\n\nThree. Four.";
      expect(segment(tokens, captured, "en", AUTO)).toEqual([
        "One.",
        "Two.",
        "Three.",
        "Four.",
      ]);
    });

    it("ignores wordCount in auto mode", () => {
      const tokens = ["Hello", "world."];
      expect(
        segment(tokens, "Hello world.", "en", { mode: "auto", wordCount: 1 }),
      ).toEqual(["Hello world."]);
    });
  });

  describe("auto mode: sentences", () => {
    it("splits consecutive short sentences into one chunk each", () => {
      const tokens = ["The", "cat", "sat.", "The", "dog", "ran."];
      expect(segment(tokens, tokens.join(" "), "en", AUTO)).toEqual([
        "The cat sat.",
        "The dog ran.",
      ]);
    });

    it("treats ?, !, and ... as sentence ends", () => {
      const tokens = ["Ready?", "Go!", "Wait..."];
      expect(segment(tokens, "Ready? Go! Wait...", "en", AUTO)).toEqual([
        "Ready?",
        "Go!",
        "Wait...",
      ]);
    });

    it("keeps a short sentence of 20 tokens or fewer together", () => {
      const tokens = [...words(19), "end."];
      expect(segment(tokens, tokens.join(" "), "en", AUTO)).toEqual([
        tokens.join(" "),
      ]);
    });

    it("does not treat U.S. as a sentence end when the next token is lowercase", () => {
      const tokens = ["He", "lives", "in", "the", "U.S.", "now."];
      expect(segment(tokens, tokens.join(" "), "en", AUTO)).toEqual([
        "He lives in the U.S. now.",
      ]);
    });
  });

  describe("auto mode: clauses", () => {
    it("keeps a short clause with a semicolon together", () => {
      const tokens = ["Wait;", "then", "go."];
      expect(segment(tokens, "Wait; then go.", "en", AUTO)).toEqual([
        "Wait; then go.",
      ]);
    });

    it("splits a long leftover on a strong clause mark", () => {
      const left = words(12, "a");
      left[left.length - 1] = `${left[left.length - 1]};`;
      const right = words(12, "b");
      right[right.length - 1] = `${right[right.length - 1]}.`;
      const tokens = [...left, ...right];
      expect(segment(tokens, tokens.join(" "), "en", AUTO)).toEqual([
        left.join(" "),
        right.join(" "),
      ]);
    });

    it("splits a long leftover on a colon", () => {
      const left = words(12, "a");
      left[left.length - 1] = `${left[left.length - 1]}:`;
      const right = words(12, "b");
      right[right.length - 1] = `${right[right.length - 1]}.`;
      const tokens = [...left, ...right];
      expect(segment(tokens, tokens.join(" "), "en", AUTO)).toEqual([
        left.join(" "),
        right.join(" "),
      ]);
    });

    it("splits a long leftover on an em dash present in captured text", () => {
      const left = words(12, "a");
      const right = words(12, "b");
      right[right.length - 1] = `${right[right.length - 1]}.`;
      const tokens = [...left, ...right];
      const captured = `${left.join(" ")} — ${right.join(" ")}`;
      expect(segment(tokens, captured, "en", AUTO)).toEqual([
        left.join(" "),
        right.join(" "),
      ]);
    });

    it("does not split a comma list that is not two clauses", () => {
      const tokens = [
        "We",
        "need",
        "apples,",
        "oranges,",
        "bananas,",
        "grapes,",
        "pears,",
        "mangoes,",
        "plums,",
        "and",
        "limes.",
      ];
      expect(segment(tokens, tokens.join(" "), "en", AUTO)).toEqual([
        tokens.join(" "),
      ]);
    });

    it("splits a long leftover on a clause-like comma", () => {
      const dependent = [
        "Although",
        "the",
        "rain",
        "continued",
        "for",
        "hours",
        "along",
        "the",
        "entire",
        "coast,",
      ];
      const main = [
        "we",
        "still",
        "walked",
        "to",
        "the",
        "market",
        "because",
        "the",
        "list",
        "could",
        "not",
        "wait.",
      ];
      const tokens = [...dependent, ...main];
      expect(segment(tokens, tokens.join(" "), "en", AUTO)).toEqual([
        dependent.join(" "),
        main.join(" "),
      ]);
    });
  });

  describe("auto mode: packing leftovers", () => {
    it("keeps a leftover of 20 tokens together", () => {
      const tokens = words(20);
      expect(segment(tokens, tokens.join(" "), "en", AUTO)).toEqual([
        tokens.join(" "),
      ]);
    });

    it("packs a leftover longer than 20 tokens near 12 and avoids a tiny tail", () => {
      const tokens = [...words(24), "end."];
      const chunks = segment(tokens, tokens.join(" "), "en", AUTO);
      expectChunksCoverTokens(chunks, tokens);
      const sizes = tokenSizes(chunks, tokens);
      expect(sizes.length).toBeGreaterThan(1);
      expect(Math.max(...sizes)).toBeLessThanOrEqual(20);
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(8);
      expect(sizes).not.toContain(1);
    });
  });

  describe("locale", () => {
    it("defaults to English when locale is omitted", () => {
      const tokens = ["The", "cat", "sat.", "The", "dog", "ran."];
      const captured = tokens.join(" ");
      expect(segment(tokens, captured)).toEqual(
        segment(tokens, captured, "en", AUTO),
      );
    });

    it("still splits structure and sentences for a non-English locale", () => {
      const tokens = ["Un.", "Deux.", "Trois.", "Quatre."];
      const captured = "Un. Deux.\n\nTrois. Quatre.";
      expect(segment(tokens, captured, "fr", AUTO)).toEqual([
        "Un.",
        "Deux.",
        "Trois.",
        "Quatre.",
      ]);
    });

    it("does not apply English clause or packing heuristics for other locales", () => {
      const left = words(12, "a");
      left[left.length - 1] = `${left[left.length - 1]};`;
      const right = words(12, "b");
      right[right.length - 1] = `${right[right.length - 1]}.`;
      const tokens = [...left, ...right];
      expect(segment(tokens, tokens.join(" "), "fr", AUTO)).toEqual([
        tokens.join(" "),
      ]);
    });
  });

  describe("pipeline: normalize then segment", () => {
    it("receives fused units from the normalizer and keeps them whole", () => {
      const captured = "Meet Dr. Smith Jr. at 12:00 PM in the U.S. today.";
      const tokens = normalizeTokens(tokenize(captured));
      expect(tokens).toEqual([
        "Meet",
        "Dr. Smith Jr.",
        "at",
        "12:00 PM",
        "in",
        "the",
        "U.S.",
        "today.",
      ]);
      const chunks = segment(tokens, captured, "en", custom(3));
      expect(chunks).toEqual([
        "Meet Dr. Smith Jr. at",
        "12:00 PM in the",
        "U.S. today.",
      ]);
    });
  });
});
