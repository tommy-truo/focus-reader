import { describe, expect, it } from "vitest";
import { remap } from "../../src/core/remapper";

describe("remap", () => {
  describe("empty lists", () => {
    it("returns 0 when both lists are empty", () => {
      expect(remap([], 0, [])).toBe(0);
      expect(remap([], 4, [])).toBe(0);
    });

    it("returns 0 when the previous list is empty", () => {
      expect(remap([], 0, ["one two", "three"])).toBe(0);
      expect(remap([], 8, ["one two", "three"])).toBe(0);
    });

    it("returns 0 when the new list is empty", () => {
      expect(remap(["one two", "three"], 0, [])).toBe(0);
      expect(remap(["one two", "three"], 1, [])).toBe(0);
      expect(remap(["one two", "three"], 99, [])).toBe(0);
    });
  });

  describe("same chunk list", () => {
    const chunks = ["alpha beta", "gamma", "delta epsilon zeta"];

    it("keeps index 0", () => {
      expect(remap(chunks, 0, chunks)).toBe(0);
    });

    it("keeps a middle index", () => {
      expect(remap(chunks, 1, chunks)).toBe(1);
    });

    it("keeps the last index", () => {
      expect(remap(chunks, 2, chunks)).toBe(2);
    });
  });

  describe("token-offset placement", () => {
    it("uses the start of the previous chunk as the token offset", () => {
      const oldChunks = ["one two", "three four", "five six"];
      const newChunks = ["one", "two three", "four five six"];

      expect(remap(oldChunks, 0, newChunks)).toBe(0);
      expect(remap(oldChunks, 1, newChunks)).toBe(1);
      expect(remap(oldChunks, 2, newChunks)).toBe(2);
    });

    it("maps finer chunks onto a coarser list", () => {
      const oldChunks = ["a", "b", "c", "d", "e", "f"];
      const newChunks = ["a b", "c d", "e f"];

      expect(remap(oldChunks, 0, newChunks)).toBe(0);
      expect(remap(oldChunks, 1, newChunks)).toBe(0);
      expect(remap(oldChunks, 2, newChunks)).toBe(1);
      expect(remap(oldChunks, 3, newChunks)).toBe(1);
      expect(remap(oldChunks, 4, newChunks)).toBe(2);
      expect(remap(oldChunks, 5, newChunks)).toBe(2);
    });

    it("maps coarser chunks onto a finer list", () => {
      const oldChunks = ["a b", "c d", "e f"];
      const newChunks = ["a", "b", "c", "d", "e", "f"];

      expect(remap(oldChunks, 0, newChunks)).toBe(0);
      expect(remap(oldChunks, 1, newChunks)).toBe(2);
      expect(remap(oldChunks, 2, newChunks)).toBe(4);
    });

    it("lands on the new chunk that covers the same word, not a neighbor", () => {
      const oldChunks = ["one two three four", "five"];
      const newChunks = ["one two", "three four", "five"];

      expect(remap(oldChunks, 0, newChunks)).toBe(0);
      expect(remap(oldChunks, 1, newChunks)).toBe(2);
    });

    it("counts whitespace-separated words, including punctuation attached to a word", () => {
      const oldChunks = ["Hello,", "world."];
      const newChunks = ["Hello, world."];

      expect(remap(oldChunks, 0, newChunks)).toBe(0);
      expect(remap(oldChunks, 1, newChunks)).toBe(0);
    });

    it("counts spaces inside a fused name as separate words", () => {
      const oldChunks = ["Meet", "Dr. Smith", "today."];
      const newChunks = ["Meet Dr. Smith", "today."];

      expect(remap(oldChunks, 0, newChunks)).toBe(0);
      expect(remap(oldChunks, 1, newChunks)).toBe(0);
      expect(remap(oldChunks, 2, newChunks)).toBe(1);
    });
  });

  describe("progress is not chunk-count percentage", () => {
    it("follows words, not how far through the chunk list the reader was", () => {
      const oldChunks = ["a", "b", "c", "d e f g h i"];
      const newChunks = ["a b c d", "e f g h i"];

      expect(remap(oldChunks, 3, newChunks)).toBe(0);
    });
  });

  describe("progress is not a string offset", () => {
    it("follows word counts, not character length", () => {
      const oldChunks = ["a", "b", "c"];
      const newChunks = ["abcdefghij", "c"];

      expect(remap(oldChunks, 2, newChunks)).toBe(1);
    });
  });

  describe("clamp previous index", () => {
    it("treats an index past the last chunk as the last chunk", () => {
      const oldChunks = ["one two", "three"];
      const newChunks = ["one", "two three"];

      expect(remap(oldChunks, 2, newChunks)).toBe(1);
      expect(remap(oldChunks, 99, newChunks)).toBe(1);
    });

    it("treats a negative index as 0", () => {
      const oldChunks = ["one two", "three"];
      const newChunks = ["one", "two three"];

      expect(remap(oldChunks, -1, newChunks)).toBe(0);
      expect(remap(oldChunks, -20, newChunks)).toBe(0);
    });
  });

  describe("do not wrap", () => {
    it("stays on the last new chunk when the reader was on the last old chunk", () => {
      const oldChunks = ["a b c d", "e"];
      const newChunks = ["a", "b", "c", "d", "e"];

      expect(remap(oldChunks, 1, newChunks)).toBe(4);
    });

    it("clamps to the last new chunk when the token offset is past the new list", () => {
      const oldChunks = ["a b", "c d e f"];
      const newChunks = ["a b"];

      expect(remap(oldChunks, 1, newChunks)).toBe(0);
    });
  });

  describe("rebuild scenarios", () => {
    it("keeps the reader on the same words when custom word count grows", () => {
      const oldChunks = ["w1 w2", "w3 w4", "w5 w6", "w7 w8"];
      const newChunks = ["w1 w2 w3 w4", "w5 w6 w7 w8"];

      expect(remap(oldChunks, 0, newChunks)).toBe(0);
      expect(remap(oldChunks, 1, newChunks)).toBe(0);
      expect(remap(oldChunks, 2, newChunks)).toBe(1);
      expect(remap(oldChunks, 3, newChunks)).toBe(1);
    });

    it("keeps the reader on the same words when custom word count shrinks", () => {
      const oldChunks = ["w1 w2 w3 w4", "w5 w6 w7 w8"];
      const newChunks = ["w1 w2", "w3 w4", "w5 w6", "w7 w8"];

      expect(remap(oldChunks, 0, newChunks)).toBe(0);
      expect(remap(oldChunks, 1, newChunks)).toBe(2);
    });

    it("maps an uneven auto-like list onto even custom groups", () => {
      const oldChunks = [
        "Long paragraphs ask a lot.",
        "ReadVeil shows one segment at a time.",
      ];
      const newChunks = [
        "Long paragraphs ask a lot.",
        "ReadVeil shows one segment",
        "at a time.",
      ];

      expect(remap(oldChunks, 0, newChunks)).toBe(0);
      expect(remap(oldChunks, 1, newChunks)).toBe(1);
    });
  });

  describe("output shape", () => {
    it("returns a 0-based index into the new list", () => {
      const index = remap(["a", "b", "c"], 1, ["a b", "c"]);

      expect(typeof index).toBe("number");
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBe(0);
    });

    it("returns an in-range index when the new list is non-empty", () => {
      const newChunks = ["one two", "three four", "five"];

      for (const oldIndex of [-3, 0, 1, 2, 50]) {
        const index = remap(["one", "two", "three", "four", "five"], oldIndex, newChunks);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(newChunks.length);
      }
    });
  });
});
