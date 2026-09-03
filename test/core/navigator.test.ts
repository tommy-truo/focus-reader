import { describe, expect, it } from "vitest";
import { createNavigator } from "../../src/core/navigator";

const CHUNKS = ["First chunk.", "Second chunk.", "Last chunk."];

function snapshot(nav: ReturnType<typeof createNavigator>) {
  return {
    current: nav.current,
    index: nav.index,
    total: nav.total,
    isFirst: nav.isFirst,
    isLast: nav.isLast,
  };
}

describe("createNavigator", () => {
  describe("empty list", () => {
    it("uses index 0, empty current chunk, and both first and last", () => {
      expect(snapshot(createNavigator([]))).toEqual({
        current: "",
        index: 0,
        total: 0,
        isFirst: true,
        isLast: true,
      });
    });

    it("clamps any starting index to 0", () => {
      expect(snapshot(createNavigator([], -1))).toEqual({
        current: "",
        index: 0,
        total: 0,
        isFirst: true,
        isLast: true,
      });
      expect(snapshot(createNavigator([], 3))).toEqual({
        current: "",
        index: 0,
        total: 0,
        isFirst: true,
        isLast: true,
      });
    });

    it("does not move on next or prev", () => {
      const nav = createNavigator([]);
      nav.next();
      nav.prev();
      expect(snapshot(nav)).toEqual({
        current: "",
        index: 0,
        total: 0,
        isFirst: true,
        isLast: true,
      });
    });
  });

  describe("starting index", () => {
    it("defaults to 0", () => {
      const nav = createNavigator(CHUNKS);
      expect(nav.index).toBe(0);
      expect(nav.current).toBe("First chunk.");
      expect(nav.isFirst).toBe(true);
      expect(nav.isLast).toBe(false);
    });

    it("honors an in-range starting index", () => {
      const nav = createNavigator(CHUNKS, 1);
      expect(nav.index).toBe(1);
      expect(nav.current).toBe("Second chunk.");
      expect(nav.isFirst).toBe(false);
      expect(nav.isLast).toBe(false);
    });

    it("starts on the last chunk when given the last index", () => {
      const nav = createNavigator(CHUNKS, 2);
      expect(nav.index).toBe(2);
      expect(nav.current).toBe("Last chunk.");
      expect(nav.isFirst).toBe(false);
      expect(nav.isLast).toBe(true);
    });

    it("clamps a negative starting index to 0", () => {
      const nav = createNavigator(CHUNKS, -1);
      expect(nav.index).toBe(0);
      expect(nav.current).toBe("First chunk.");
    });

    it("clamps a starting index past the last chunk to the last index", () => {
      expect(createNavigator(CHUNKS, 3).index).toBe(2);
      expect(createNavigator(CHUNKS, 99).index).toBe(2);
      expect(createNavigator(CHUNKS, 99).current).toBe("Last chunk.");
    });
  });

  describe("position", () => {
    it("reports the chunk count as total", () => {
      expect(createNavigator(CHUNKS).total).toBe(3);
      expect(createNavigator(["only"]).total).toBe(1);
    });

    it("treats a single chunk as both first and last", () => {
      const nav = createNavigator(["only"]);
      expect(nav.isFirst).toBe(true);
      expect(nav.isLast).toBe(true);
      expect(nav.current).toBe("only");
    });

    it("passes chunk strings through unchanged", () => {
      const chunks = ["Meet Dr. Smith Jr.", "at 12:00 PM.", "Hello,"];
      expect(createNavigator(chunks).current).toBe("Meet Dr. Smith Jr.");
      expect(createNavigator(chunks, 1).current).toBe("at 12:00 PM.");
      expect(createNavigator(chunks, 2).current).toBe("Hello,");
    });
  });

  describe("next", () => {
    it("advances the index and current chunk by one", () => {
      const nav = createNavigator(CHUNKS);
      nav.next();
      expect(nav.index).toBe(1);
      expect(nav.current).toBe("Second chunk.");
      expect(nav.isFirst).toBe(false);
      expect(nav.isLast).toBe(false);
    });

    it("does not wrap past the last chunk", () => {
      const nav = createNavigator(CHUNKS, 2);
      nav.next();
      nav.next();
      expect(nav.index).toBe(2);
      expect(nav.current).toBe("Last chunk.");
      expect(nav.isLast).toBe(true);
    });

    it("does not return a new chunk list", () => {
      const nav = createNavigator(CHUNKS);
      expect(nav.next()).toBeUndefined();
      expect(nav.total).toBe(3);
    });
  });

  describe("prev", () => {
    it("moves the index and current chunk back by one", () => {
      const nav = createNavigator(CHUNKS, 2);
      nav.prev();
      expect(nav.index).toBe(1);
      expect(nav.current).toBe("Second chunk.");
      expect(nav.isFirst).toBe(false);
      expect(nav.isLast).toBe(false);
    });

    it("does not wrap before the first chunk", () => {
      const nav = createNavigator(CHUNKS);
      nav.prev();
      nav.prev();
      expect(nav.index).toBe(0);
      expect(nav.current).toBe("First chunk.");
      expect(nav.isFirst).toBe(true);
    });

    it("does not return a new chunk list", () => {
      const nav = createNavigator(CHUNKS, 1);
      expect(nav.prev()).toBeUndefined();
      expect(nav.total).toBe(3);
    });
  });

  describe("walking the list", () => {
    it("visits every chunk in order and back", () => {
      const nav = createNavigator(CHUNKS);
      const forward: string[] = [nav.current];
      while (!nav.isLast) {
        nav.next();
        forward.push(nav.current);
      }
      expect(forward).toEqual(CHUNKS);

      const backward: string[] = [nav.current];
      while (!nav.isFirst) {
        nav.prev();
        backward.push(nav.current);
      }
      expect(backward).toEqual([...CHUNKS].reverse());
    });

    it("keeps the same chunk list while the index moves", () => {
      const nav = createNavigator(CHUNKS);
      nav.next();
      nav.next();
      nav.prev();
      expect(nav.total).toBe(CHUNKS.length);
      expect(nav.current).toBe("Second chunk.");
    });
  });

  describe("chunk list ownership", () => {
    it("does not mutate the input list when moving", () => {
      const chunks = ["a", "b", "c"];
      const nav = createNavigator(chunks);
      nav.next();
      nav.prev();
      expect(chunks).toEqual(["a", "b", "c"]);
    });

    it("does not share movement across two navigators on the same list", () => {
      const navA = createNavigator(CHUNKS, 0);
      const navB = createNavigator(CHUNKS, 0);
      navA.next();
      expect(navA.index).toBe(1);
      expect(navB.index).toBe(0);
      expect(navB.current).toBe("First chunk.");
    });
  });

  describe("rebuild handoff", () => {
    it("can start a new navigator at a remapped index without changing the old one", () => {
      const oldNav = createNavigator(["one two", "three four five"], 1);
      const rebuilt = ["one", "two three", "four five"];
      const newNav = createNavigator(rebuilt, 2);

      expect(oldNav.current).toBe("three four five");
      expect(oldNav.index).toBe(1);
      expect(newNav.current).toBe("four five");
      expect(newNav.index).toBe(2);
      expect(newNav.total).toBe(3);
    });
  });
});
