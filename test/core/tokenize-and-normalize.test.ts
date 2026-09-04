import { describe, expect, it } from "vitest";
import { normalizeTokens } from "../../src/core/token-normalizer";
import { tokenize } from "../../src/core/tokenizer";

function tokenizeAndNormalize(text: string, locale?: string): string[] {
  return normalizeTokens(tokenize(text, locale));
}

describe("tokenize then normalize", () => {
  describe("pipeline contract", () => {
    it("keeps the tokenizer mechanical and lets the normalizer fuse title + name", () => {
      expect(tokenize("Dr. Smith")).toEqual(["Dr.", "Smith"]);
      expect(normalizeTokens(["Dr.", "Smith"])).toEqual(["Dr. Smith"]);
      expect(tokenizeAndNormalize("Dr. Smith")).toEqual(["Dr. Smith"]);
    });

    it("keeps the tokenizer mechanical and lets the normalizer fuse title + name + Jr.", () => {
      expect(tokenize("Dr. Smith Jr.")).toEqual(["Dr.", "Smith", "Jr."]);
      expect(normalizeTokens(["Dr.", "Smith", "Jr."])).toEqual([
        "Dr. Smith Jr.",
      ]);
      expect(tokenizeAndNormalize("Dr. Smith Jr.")).toEqual(["Dr. Smith Jr."]);
    });

    it("keeps the tokenizer mechanical and lets the normalizer fuse name + Jr.", () => {
      expect(tokenize("Smith Jr.")).toEqual(["Smith", "Jr."]);
      expect(normalizeTokens(["Smith", "Jr."])).toEqual(["Smith Jr."]);
      expect(tokenizeAndNormalize("Smith Jr.")).toEqual(["Smith Jr."]);
    });

    it("keeps a space-separated time as two tokens until the normalizer", () => {
      expect(tokenize("12:00 PM")).toEqual(["12:00", "PM"]);
      expect(tokenizeAndNormalize("12:00 PM")).toEqual(["12:00 PM"]);
    });
  });

  describe("empty input", () => {
    it("returns an empty list for empty or whitespace-only text", () => {
      expect(tokenizeAndNormalize("")).toEqual([]);
      expect(tokenizeAndNormalize(" ")).toEqual([]);
    });
  });

  describe("punctuation without joins", () => {
    it("keeps attached punctuation and does not invent joins", () => {
      expect(tokenizeAndNormalize("Hello, world")).toEqual(["Hello,", "world"]);
    });
  });

  describe("titles + name + suffix", () => {
    it("fuses title and name in a sentence", () => {
      expect(tokenizeAndNormalize("Dr. Smith arrived.")).toEqual([
        "Dr. Smith",
        "arrived.",
      ]);
    });

    it("fuses title, name, and Jr. in a sentence", () => {
      expect(tokenizeAndNormalize("Dr. Smith Jr. arrived.")).toEqual([
        "Dr. Smith Jr.",
        "arrived.",
      ]);
    });

    it("fuses title, name, and Sr. in a sentence", () => {
      expect(tokenizeAndNormalize("Mr. Jones Sr. sat down.")).toEqual([
        "Mr. Jones Sr.",
        "sat",
        "down.",
      ]);
    });

    it("fuses each titled name, including suffixes, in one sentence", () => {
      expect(
        tokenizeAndNormalize("Meet Mr. Jones Sr. and Mrs. Lee Jr. today."),
      ).toEqual(["Meet", "Mr. Jones Sr.", "and", "Mrs. Lee Jr.", "today."]);
    });

    it("attaches sentence punctuation on the name when there is no suffix", () => {
      expect(tokenizeAndNormalize("Hello, Dr. Smith.")).toEqual([
        "Hello,",
        "Dr. Smith.",
      ]);
    });

    it("fuses a possessive titled name", () => {
      expect(tokenizeAndNormalize("Dr. Smith's office")).toEqual([
        "Dr. Smith's",
        "office",
      ]);
    });

    it("fuses a titled name with a trailing possessive apostrophe", () => {
      expect(tokenizeAndNormalize("save Mr. Krabs' life")).toEqual([
        "save",
        "Mr. Krabs'",
        "life",
      ]);
    });

    it("does not treat Jr. or Sr. as a prefix title", () => {
      expect(tokenizeAndNormalize("Jr. Smith left")).toEqual([
        "Jr.",
        "Smith",
        "left",
      ]);
      expect(tokenizeAndNormalize("Sr. Garcia left")).toEqual([
        "Sr.",
        "Garcia",
        "left",
      ]);
    });

    it("fuses a name and Jr. without a title", () => {
      expect(tokenizeAndNormalize("Smith Jr. left")).toEqual([
        "Smith Jr.",
        "left",
      ]);
    });

    it("fuses a name and Sr. without a title", () => {
      expect(tokenizeAndNormalize("Jones Sr. sat down.")).toEqual([
        "Jones Sr.",
        "sat",
        "down.",
      ]);
    });

    it("fuses titled and untitled name+suffix pairs in one sentence", () => {
      expect(
        tokenizeAndNormalize("Meet Dr. Smith Jr. and Jones Sr. today."),
      ).toEqual(["Meet", "Dr. Smith Jr.", "and", "Jones Sr.", "today."]);
    });
  });

  describe("times", () => {
    it("fuses a clock time with a following meridiem", () => {
      expect(
        tokenizeAndNormalize("The meeting is at 12:00 PM tomorrow."),
      ).toEqual(["The", "meeting", "is", "at", "12:00 PM", "tomorrow."]);
    });

    it("leaves a tokenizer-attached time+meridiem as one token", () => {
      expect(tokenizeAndNormalize("Arrive by 3:30pm please.")).toEqual([
        "Arrive",
        "by",
        "3:30pm",
        "please.",
      ]);
    });

    it("fuses a time with dotted a.m.", () => {
      expect(tokenizeAndNormalize("Lunch at 12:00 a.m.")).toEqual([
        "Lunch",
        "at",
        "12:00 a.m.",
      ]);
    });
  });

  describe("abbreviations and numerics", () => {
    it("fuses U.S. and U.K. to single tokens", () => {
      expect(tokenizeAndNormalize("In the U.S. and U.K. today")).toEqual([
        "In",
        "the",
        "U.S.",
        "and",
        "U.K.",
        "today",
      ]);
    });

    it("fuses e.g. and i.e. to single tokens", () => {
      expect(tokenizeAndNormalize("See e.g. the manual")).toEqual([
        "See",
        "e.g.",
        "the",
        "manual",
      ]);
      expect(tokenizeAndNormalize("That is i.e. clear")).toEqual([
        "That",
        "is",
        "i.e.",
        "clear",
      ]);
    });

    it("leaves vs. and etc. as units", () => {
      expect(tokenizeAndNormalize("red vs. blue")).toEqual([
        "red",
        "vs.",
        "blue",
      ]);
      expect(tokenizeAndNormalize("books, pencils, etc. on the desk")).toEqual([
        "books,",
        "pencils,",
        "etc.",
        "on",
        "the",
        "desk",
      ]);
    });

    it("keeps numerics with internal punctuation as tokens", () => {
      expect(tokenizeAndNormalize("1,000 and 1.5")).toEqual([
        "1,000",
        "and",
        "1.5",
      ]);
    });

    it("keeps decade years, parenthetical years, and sentence-final years intact", () => {
      expect(
        tokenizeAndNormalize(
          "created in the 1980s. Movie (2004), but returned in 2018.",
        ),
      ).toEqual([
        "created",
        "in",
        "the",
        "1980s.",
        "Movie",
        "(2004),",
        "but",
        "returned",
        "in",
        "2018.",
      ]);
    });
  });

  describe("mixed joins", () => {
    it("applies title+suffix, name+suffix, time, and abbreviation joins together", () => {
      expect(
        tokenizeAndNormalize(
          "Visit the U.S. at 12:00 PM with Dr. Smith Jr. and Jones Sr.",
        ),
      ).toEqual([
        "Visit",
        "the",
        "U.S.",
        "at",
        "12:00 PM",
        "with",
        "Dr. Smith Jr.",
        "and",
        "Jones Sr.",
      ]);
    });
  });
});
