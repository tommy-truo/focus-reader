import { describe, expect, it } from "vitest";
import { tokenize } from "../../src/core/tokenizer";

describe("tokenize", () => {
  describe("empty input", () => {
    it("returns an empty list for an empty string", () => {
      expect(tokenize("")).toEqual([]);
    });

    it("returns an empty list for whitespace-only text", () => {
      expect(tokenize(" ")).toEqual([]);
      expect(tokenize("   ")).toEqual([]);
      expect(tokenize("\t")).toEqual([]);
      expect(tokenize("\n")).toEqual([]);
    });
  });

  describe("word-like splits", () => {
    it("returns a single word as one token", () => {
      expect(tokenize("Hello")).toEqual(["Hello"]);
    });

    it("splits on spaces into ordered word tokens", () => {
      expect(tokenize("Hello world")).toEqual(["Hello", "world"]);
      expect(tokenize("The cat sat")).toEqual(["The", "cat", "sat"]);
    });

    it("drops extra spaces between words", () => {
      expect(tokenize("Hello  world")).toEqual(["Hello", "world"]);
    });

    it("keeps English contractions as one token", () => {
      expect(tokenize("it's")).toEqual(["it's"]);
      expect(tokenize("don't")).toEqual(["don't"]);
      expect(tokenize("Smith's")).toEqual(["Smith's"]);
    });
  });

  describe("punctuation attachment", () => {
    it("attaches trailing punctuation to the preceding word", () => {
      expect(tokenize("Hello,")).toEqual(["Hello,"]);
      expect(tokenize("Hello.")).toEqual(["Hello."]);
      expect(tokenize("Hello!")).toEqual(["Hello!"]);
      expect(tokenize("Hello?")).toEqual(["Hello?"]);
      expect(tokenize("Hello...")).toEqual(["Hello..."]);
    });

    it('keeps wrapping quotes on the word: "Hello," is one token', () => {
      expect(tokenize('"Hello,"')).toEqual(['"Hello,"']);
    });

    it("keeps wrapping parentheses on the word", () => {
      expect(tokenize("(Hello)")).toEqual(["(Hello)"]);
    });

    it("attaches comma to the preceding word in a phrase", () => {
      expect(tokenize("Hello, world")).toEqual(["Hello,", "world"]);
    });
  });

  describe("numerics with internal punctuation", () => {
    it("keeps grouped numbers as one token", () => {
      expect(tokenize("1,000")).toEqual(["1,000"]);
      expect(tokenize("1,000,000")).toEqual(["1,000,000"]);
    });

    it("keeps decimals as one token", () => {
      expect(tokenize("1.5")).toEqual(["1.5"]);
    });

    it("keeps numbers with commas and decimals as one token", () => {
      expect(tokenize("1,000.50")).toEqual(["1,000.50"]);
    });

    it("keeps clock times as one token", () => {
      expect(tokenize("12:00")).toEqual(["12:00"]);
      expect(tokenize("3:30")).toEqual(["3:30"]);
    });

    it("keeps a time with attached meridiem as one token", () => {
      expect(tokenize("3:30pm")).toEqual(["3:30pm"]);
      expect(tokenize("12:00am")).toEqual(["12:00am"]);
    });

    it("splits a time and meridiem when they are separated by a space", () => {
      expect(tokenize("12:00 PM")).toEqual(["12:00", "PM"]);
      expect(tokenize("3:30 pm")).toEqual(["3:30", "pm"]);
    });
  });

  describe("mechanical splits (does not fuse)", () => {
    it("does not fuse a title and name", () => {
      expect(tokenize("Dr. Smith")).toEqual(["Dr.", "Smith"]);
      expect(tokenize("Mr. Jones")).toEqual(["Mr.", "Jones"]);
    });

    it("does not fuse title, name, and Sr./Jr. suffix", () => {
      expect(tokenize("Dr. Smith Jr.")).toEqual(["Dr.", "Smith", "Jr."]);
      expect(tokenize("Mr. Jones Sr.")).toEqual(["Mr.", "Jones", "Sr."]);
    });

    it("does not fuse a name and Sr./Jr. suffix", () => {
      expect(tokenize("Smith Jr.")).toEqual(["Smith", "Jr."]);
      expect(tokenize("Jones Sr.")).toEqual(["Jones", "Sr."]);
    });
  });

  describe("locale", () => {
    it("defaults to English when locale is omitted", () => {
      expect(tokenize("Hello, world")).toEqual(
        tokenize("Hello, world", "en"),
      );
    });

    it("tokenizes English the same for an explicit en locale", () => {
      expect(tokenize("Hello, world", "en")).toEqual(["Hello,", "world"]);
    });
  });
});
