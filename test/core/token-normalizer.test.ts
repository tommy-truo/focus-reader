import { describe, expect, it } from "vitest";
import { normalizeTokens } from "../../src/core/token-normalizer";

const TITLES = ["Dr.", "Mr.", "Mrs.", "Ms.", "Prof."] as const;

describe("normalizeTokens", () => {
  describe("identity", () => {
    it("returns an empty list unchanged", () => {
      expect(normalizeTokens([])).toEqual([]);
    });

    it("passes through tokens that match no join rule", () => {
      expect(normalizeTokens(["Hello", "world"])).toEqual(["Hello", "world"]);
    });

    it("does not split a token that already arrived fused", () => {
      expect(normalizeTokens(["Dr. Smith"])).toEqual(["Dr. Smith"]);
      expect(normalizeTokens(["Dr. Smith Jr."])).toEqual(["Dr. Smith Jr."]);
      expect(normalizeTokens(["Smith Jr."])).toEqual(["Smith Jr."]);
    });
  });

  describe("titles + name", () => {
    it.each(TITLES)("merges %s with the following capitalized name", (title) => {
      expect(normalizeTokens([title, "Smith"])).toEqual([`${title} Smith`]);
    });

    it("joins with a space between title and name", () => {
      expect(normalizeTokens(["Dr.", "Smith"])).toEqual(["Dr. Smith"]);
    });

    it("does not join when the following token is missing", () => {
      expect(normalizeTokens(["Dr."])).toEqual(["Dr."]);
    });

    it("does not join when the following token is not capitalized", () => {
      expect(normalizeTokens(["Dr.", "smith"])).toEqual(["Dr.", "smith"]);
    });

    it("does not join a non-title with a capitalized word", () => {
      expect(normalizeTokens(["Doctor", "Smith"])).toEqual(["Doctor", "Smith"]);
    });

    it("merges only the title and the next capitalized name", () => {
      expect(normalizeTokens(["Prof.", "Mary", "Ng"])).toEqual([
        "Prof. Mary",
        "Ng",
      ]);
    });

    it("fuses multiple title+name pairs in one pass", () => {
      expect(
        normalizeTokens(["Dr.", "Smith", "and", "Mr.", "Jones"]),
      ).toEqual(["Dr. Smith", "and", "Mr. Jones"]);
    });

    it("merges a title with a name that uses a trailing possessive apostrophe", () => {
      expect(normalizeTokens(["Mr.", "Krabs'"])).toEqual(["Mr. Krabs'"]);
    });
  });

  describe("titles + name + Sr./Jr.", () => {
    it("merges title, name, and Jr. into one token", () => {
      expect(normalizeTokens(["Dr.", "Smith", "Jr."])).toEqual([
        "Dr. Smith Jr.",
      ]);
    });

    it("merges title, name, and Sr. into one token", () => {
      expect(normalizeTokens(["Mr.", "Jones", "Sr."])).toEqual([
        "Mr. Jones Sr.",
      ]);
    });

    it.each(TITLES)("applies Jr. after %s + name", (title) => {
      expect(normalizeTokens([title, "Lee", "Jr."])).toEqual([
        `${title} Lee Jr.`,
      ]);
    });

    it.each(TITLES)("applies Sr. after %s + name", (title) => {
      expect(normalizeTokens([title, "Lee", "Sr."])).toEqual([
        `${title} Lee Sr.`,
      ]);
    });

    it("joins all three pieces with spaces", () => {
      expect(normalizeTokens(["Mrs.", "Patel", "Jr."])).toEqual([
        "Mrs. Patel Jr.",
      ]);
    });

    it("leaves tokens after the suffix in place", () => {
      expect(
        normalizeTokens(["Dr.", "Smith", "Jr.", "spoke", "next"]),
      ).toEqual(["Dr. Smith Jr.", "spoke", "next"]);
    });

    it("fuses two title+name+suffix groups in one pass", () => {
      expect(
        normalizeTokens([
          "Dr.",
          "Smith",
          "Jr.",
          "and",
          "Mr.",
          "Jones",
          "Sr.",
        ]),
      ).toEqual(["Dr. Smith Jr.", "and", "Mr. Jones Sr."]);
    });

    it("still fuses title+name when the following token is not Sr./Jr.", () => {
      expect(normalizeTokens(["Dr.", "Smith", "III"])).toEqual([
        "Dr. Smith",
        "III",
      ]);
    });

    it("does not treat Jr. as a title", () => {
      expect(normalizeTokens(["Jr.", "Smith"])).toEqual(["Jr.", "Smith"]);
    });

    it("does not treat Sr. as a title", () => {
      expect(normalizeTokens(["Sr.", "Garcia"])).toEqual(["Sr.", "Garcia"]);
    });

    it("does not merge title + suffix with no name between them", () => {
      expect(normalizeTokens(["Dr.", "Jr."])).toEqual(["Dr.", "Jr."]);
      expect(normalizeTokens(["Dr.", "Sr."])).toEqual(["Dr.", "Sr."]);
    });

    it("does not attach a suffix when the name is not capitalized", () => {
      expect(normalizeTokens(["Dr.", "smith", "Jr."])).toEqual([
        "Dr.",
        "smith",
        "Jr.",
      ]);
    });
  });

  describe("name + Sr./Jr.", () => {
    it("merges a capitalized name with Jr.", () => {
      expect(normalizeTokens(["Smith", "Jr."])).toEqual(["Smith Jr."]);
    });

    it("merges a capitalized name with Sr.", () => {
      expect(normalizeTokens(["Jones", "Sr."])).toEqual(["Jones Sr."]);
    });

    it("joins name and suffix with a space", () => {
      expect(normalizeTokens(["Lee", "Jr."])).toEqual(["Lee Jr."]);
    });

    it("leaves tokens after the suffix in place", () => {
      expect(normalizeTokens(["Smith", "Jr.", "spoke", "next"])).toEqual([
        "Smith Jr.",
        "spoke",
        "next",
      ]);
    });

    it("fuses multiple name+suffix pairs in one pass", () => {
      expect(
        normalizeTokens(["Smith", "Jr.", "and", "Jones", "Sr."]),
      ).toEqual(["Smith Jr.", "and", "Jones Sr."]);
    });

    it("does not attach a suffix to a lowercase word", () => {
      expect(normalizeTokens(["smith", "Jr."])).toEqual(["smith", "Jr."]);
    });

    it("does not attach a suffix to a non-name following token", () => {
      expect(normalizeTokens(["Smith", "III"])).toEqual(["Smith", "III"]);
    });
  });

  describe("time + meridiem", () => {
    it("merges a clock time with a following meridiem, keeping a space", () => {
      expect(normalizeTokens(["12:00", "PM"])).toEqual(["12:00 PM"]);
      expect(normalizeTokens(["12:00", "AM"])).toEqual(["12:00 AM"]);
      expect(normalizeTokens(["3:30", "pm"])).toEqual(["3:30 pm"]);
      expect(normalizeTokens(["3:30", "am"])).toEqual(["3:30 am"]);
    });

    it("merges a clock time with dotted meridiem forms", () => {
      expect(normalizeTokens(["12:00", "a.m."])).toEqual(["12:00 a.m."]);
      expect(normalizeTokens(["3:30", "p.m."])).toEqual(["3:30 p.m."]);
    });

    it("merges a clock time when a.m./p.m. arrived as two tokens", () => {
      expect(normalizeTokens(["12:00", "a.", "m."])).toEqual(["12:00 a.m."]);
      expect(normalizeTokens(["3:30", "p.", "m."])).toEqual(["3:30 p.m."]);
    });

    it("leaves an already-attached time+meridiem token unchanged", () => {
      expect(normalizeTokens(["3:30pm"])).toEqual(["3:30pm"]);
    });

    it("does not join a time when the next token is missing", () => {
      expect(normalizeTokens(["12:00"])).toEqual(["12:00"]);
    });

    it("does not join a time with a non-meridiem token", () => {
      expect(normalizeTokens(["12:00", "sharp"])).toEqual(["12:00", "sharp"]);
    });

    it("does not treat a. + a non-m. token as meridiem", () => {
      expect(normalizeTokens(["12:00", "a.", "meeting"])).toEqual([
        "12:00",
        "a.",
        "meeting",
      ]);
    });
  });

  describe("common abbreviations", () => {
    it("merges split country abbreviations with no extra space", () => {
      expect(normalizeTokens(["U.", "S."])).toEqual(["U.S."]);
      expect(normalizeTokens(["U.", "K."])).toEqual(["U.K."]);
    });

    it("merges split latin abbreviations with no extra space", () => {
      expect(normalizeTokens(["e.", "g."])).toEqual(["e.g."]);
      expect(normalizeTokens(["i.", "e."])).toEqual(["i.e."]);
    });

    it("leaves abbreviations unchanged when they already arrived as one token", () => {
      expect(normalizeTokens(["U.S."])).toEqual(["U.S."]);
      expect(normalizeTokens(["e.g."])).toEqual(["e.g."]);
      expect(normalizeTokens(["etc."])).toEqual(["etc."]);
      expect(normalizeTokens(["vs."])).toEqual(["vs."]);
    });

    it("does not merge letters that are not a known abbreviation", () => {
      expect(normalizeTokens(["U.", "N."])).toEqual(["U.", "N."]);
    });

    it("does not keep consuming after a completed abbreviation", () => {
      expect(normalizeTokens(["U.", "S.", "A."])).toEqual(["U.S.", "A."]);
    });
  });

  describe("single pass", () => {
    it("does not reuse a token already consumed by a join", () => {
      expect(normalizeTokens(["Dr.", "Smith", "Jr.", "Lee"])).toEqual([
        "Dr. Smith Jr.",
        "Lee",
      ]);
    });

    it("applies title, name-suffix, time, and abbreviation joins in one left-to-right pass", () => {
      expect(
        normalizeTokens([
          "Dr.",
          "Smith",
          "Jr.",
          "and",
          "Jones",
          "Sr.",
          "at",
          "12:00",
          "PM",
          "in",
          "the",
          "U.",
          "S.",
        ]),
      ).toEqual([
        "Dr. Smith Jr.",
        "and",
        "Jones Sr.",
        "at",
        "12:00 PM",
        "in",
        "the",
        "U.S.",
      ]);
    });

    it("is idempotent", () => {
      const once = normalizeTokens([
        "Dr.",
        "Smith",
        "Jr.",
        "and",
        "Jones",
        "Sr.",
        "and",
        "U.",
        "S.",
      ]);
      expect(normalizeTokens(once)).toEqual(once);
    });
  });
});
