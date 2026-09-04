import { describe, expect, it } from "vitest";
import { cleanseText } from "../../src/core/text-cleanser";

describe("cleanseText", () => {
  describe("empty input", () => {
    it("returns an empty string for an empty string", () => {
      expect(cleanseText("")).toBe("");
    });

    it("returns an empty string for whitespace-only text", () => {
      expect(cleanseText(" ")).toBe("");
      expect(cleanseText("   ")).toBe("");
      expect(cleanseText("\t")).toBe("");
      expect(cleanseText("\n")).toBe("");
      expect(cleanseText("\n\n")).toBe("");
      expect(cleanseText(" \t \n \r\n ")).toBe("");
      expect(cleanseText("\u00a0")).toBe("");
    });
  });

  describe("trim", () => {
    it("trims leading spaces", () => {
      expect(cleanseText("  Hello")).toBe("Hello");
    });

    it("trims trailing spaces", () => {
      expect(cleanseText("Hello  ")).toBe("Hello");
    });

    it("trims leading and trailing spaces", () => {
      expect(cleanseText("  Hello  ")).toBe("Hello");
    });

    it("trims leading and trailing tabs", () => {
      expect(cleanseText("\tHello\t")).toBe("Hello");
    });

    it("trims leading and trailing newlines", () => {
      expect(cleanseText("\nHello\n")).toBe("Hello");
      expect(cleanseText("\n\nHello\n\n")).toBe("Hello");
    });
  });

  describe("newlines become a single space", () => {
    it("replaces a line feed with a single space", () => {
      expect(cleanseText("Hello\nworld")).toBe("Hello world");
    });

    it("replaces a Windows CRLF break with a single space", () => {
      expect(cleanseText("Hello\r\nworld")).toBe("Hello world");
    });

    it("replaces a bare carriage return with a single space", () => {
      expect(cleanseText("Hello\rworld")).toBe("Hello world");
    });

    it("flattens a paragraph break (blank line) to a single space", () => {
      expect(cleanseText("Para one.\n\nPara two.")).toBe("Para one. Para two.");
      expect(cleanseText("Para one.\r\n\r\nPara two.")).toBe(
        "Para one. Para two.",
      );
    });

    it("flattens several consecutive newlines to a single space", () => {
      expect(cleanseText("Hello\n\n\nworld")).toBe("Hello world");
    });

    it("flattens list-item line breaks to a single space", () => {
      expect(cleanseText("First item\nSecond item")).toBe(
        "First item Second item",
      );
      expect(cleanseText("- apples\n- oranges")).toBe("- apples - oranges");
    });

    it("treats Unicode line and paragraph separators as newlines", () => {
      expect(cleanseText("Hello\u2028world")).toBe("Hello world");
      expect(cleanseText("Hello\u2029world")).toBe("Hello world");
    });
  });

  describe("collapse spaces and tabs", () => {
    it("collapses runs of spaces into a single space", () => {
      expect(cleanseText("Hello  world")).toBe("Hello world");
      expect(cleanseText("Hello   world")).toBe("Hello world");
    });

    it("collapses tabs into a single space", () => {
      expect(cleanseText("Hello\tworld")).toBe("Hello world");
      expect(cleanseText("Hello\t\tworld")).toBe("Hello world");
    });

    it("collapses mixed spaces and tabs into a single space", () => {
      expect(cleanseText("Hello \t  world")).toBe("Hello world");
    });

    it("collapses spaces left after newline replacement", () => {
      expect(cleanseText("Hello \n world")).toBe("Hello world");
      expect(cleanseText("Hello\n  world")).toBe("Hello world");
    });
  });

  describe("passthrough", () => {
    it("returns already-clean text unchanged", () => {
      expect(cleanseText("Hello world")).toBe("Hello world");
    });

    it("does not change casing", () => {
      expect(cleanseText("Hello World")).toBe("Hello World");
    });

    it("does not strip punctuation", () => {
      expect(cleanseText("Hello, world.")).toBe("Hello, world.");
      expect(cleanseText('"Hello,"')).toBe('"Hello,"');
      expect(cleanseText("(Hello)")).toBe("(Hello)");
    });

    it("does not rewrite contractions or numerics", () => {
      expect(cleanseText("it's 1,000 at 12:00 PM")).toBe(
        "it's 1,000 at 12:00 PM",
      );
      expect(cleanseText("3:30pm")).toBe("3:30pm");
    });

    it("does not fuse words that were already separate", () => {
      expect(cleanseText("Dr. Smith Jr.")).toBe("Dr. Smith Jr.");
    });

    it("preserves an internal non-breaking space (not a space or tab)", () => {
      expect(cleanseText("Hello\u00a0world")).toBe("Hello\u00a0world");
    });
  });

  describe("output shape", () => {
    it("returns a string, not tokens or chunks", () => {
      const result = cleanseText("Hello\nworld");
      expect(typeof result).toBe("string");
      expect(Array.isArray(result)).toBe(false);
    });
  });

  describe("captured-text shape", () => {
    it("flattens a multi-paragraph selection into one line", () => {
      const captured = [
        "Long paragraphs ask a lot of working memory.",
        "",
        "ReadVeil shows one segment at a time.",
      ].join("\n");

      expect(cleanseText(captured)).toBe(
        "Long paragraphs ask a lot of working memory. ReadVeil shows one segment at a time.",
      );
    });

    it("trims the selection and flattens inner breaks in one pass", () => {
      expect(cleanseText("  Hello,\n\nworld.  ")).toBe("Hello, world.");
    });
  });
});
