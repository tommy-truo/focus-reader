/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import {
  MAX_CAPTURE_LENGTH,
  captureText,
  captureTextFromWindow,
} from "../../src/page/text-capture";

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
});

function selectNodeContents(node: Node): void {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function selectPartialText(textNode: Text, start: number, end: number): void {
  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

describe("captureText", () => {
  describe("empty selection", () => {
    it("returns an empty string when nothing is selected", () => {
      document.body.innerHTML = "<p>Visible text</p>";
      expect(captureText()).toBe("");
    });

    it("returns an empty string for a collapsed caret", () => {
      document.body.innerHTML = "<p>Visible text</p>";
      const text = document.querySelector("p")!.firstChild as Text;
      const range = document.createRange();
      range.setStart(text, 3);
      range.collapse(true);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      expect(captureText()).toBe("");
    });

    it("returns an empty string for whitespace-only selection", () => {
      document.body.innerHTML = "<p>   </p>";
      selectNodeContents(document.querySelector("p")!);
      expect(captureText()).toBe("");
    });
  });

  describe("exact highlight", () => {
    it("returns the highlighted text and nothing nearby", () => {
      document.body.innerHTML = "<h1>Title</h1><p>Body copy.</p>";
      selectNodeContents(document.querySelector("p")!);
      expect(captureText()).toBe("Body copy.");
    });

    it("keeps a partial text-node highlight", () => {
      document.body.innerHTML = "<p>Hello world</p>";
      const text = document.querySelector("p")!.firstChild as Text;
      selectPartialText(text, 6, 11);
      expect(captureText()).toBe("world");
    });

    it("does not prepend a heading that was not selected", () => {
      document.body.innerHTML =
        "<article><h2>Nearby heading</h2><p>Only this sentence.</p></article>";
      selectNodeContents(document.querySelector("p")!);
      expect(captureText()).toBe("Only this sentence.");
      expect(captureText()).not.toContain("Nearby heading");
    });
  });

  describe("block breaks", () => {
    it("inserts a paragraph break when the selection crosses paragraphs", () => {
      document.body.innerHTML = "<div><p>Para one.</p><p>Para two.</p></div>";
      selectNodeContents(document.querySelector("div")!);
      expect(captureText()).toBe("Para one.\n\nPara two.");
    });

    it("inserts breaks between list items", () => {
      document.body.innerHTML = "<ul><li>apples</li><li>oranges</li><li>bananas</li></ul>";
      selectNodeContents(document.querySelector("ul")!);
      expect(captureText()).toBe("apples\n\noranges\n\nbananas");
    });

    it("turns a br into a single newline inside a paragraph", () => {
      document.body.innerHTML = "<p>Hello<br>world</p>";
      selectNodeContents(document.querySelector("p")!);
      expect(captureText()).toBe("Hello\nworld");
    });

    it("does not insert a break between inlines in the same block", () => {
      document.body.innerHTML = "<p>Hello <em>world</em></p>";
      selectNodeContents(document.querySelector("p")!);
      expect(captureText()).toBe("Hello world");
    });
  });

  describe("form fields", () => {
    it("reads the highlighted range in a focused input", () => {
      const input = document.createElement("input");
      input.value = "Hello world";
      document.body.append(input);
      input.focus();
      input.setSelectionRange(0, 5);
      expect(captureText()).toBe("Hello");
    });

    it("preserves newlines inside a textarea selection", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "First line\nSecond line";
      document.body.append(textarea);
      textarea.focus();
      textarea.setSelectionRange(0, textarea.value.length);
      expect(captureText()).toBe("First line\nSecond line");
    });

    it("returns empty when a focused input has no highlighted range", () => {
      const input = document.createElement("input");
      input.value = "Hello world";
      document.body.append(input);
      input.focus();
      input.setSelectionRange(3, 3);
      expect(captureText()).toBe("");
    });
  });

  describe("context-menu fallback", () => {
    it("uses fallback text only when DOM capture is empty", () => {
      document.body.innerHTML = "<p>Visible text</p>";
      expect(captureText("From the menu")).toBe("From the menu");
    });

    it("prefers the live DOM selection over fallback text", () => {
      document.body.innerHTML = "<p>Live highlight</p>";
      selectNodeContents(document.querySelector("p")!);
      expect(captureText("Longer fallback from the context menu")).toBe(
        "Live highlight",
      );
    });
  });

  describe("frames", () => {
    it("keeps the longest reachable selection across iframes", () => {
      document.body.innerHTML = "<p>Short</p>";
      selectNodeContents(document.querySelector("p")!);

      const iframe = document.createElement("iframe");
      document.body.append(iframe);
      const childDoc = iframe.contentDocument;
      expect(childDoc).not.toBeNull();
      childDoc!.body.innerHTML = "<p>A much longer selection</p>";

      const range = childDoc!.createRange();
      range.selectNodeContents(childDoc!.querySelector("p")!);
      const childSelection = iframe.contentWindow!.getSelection();
      childSelection?.removeAllRanges();
      childSelection?.addRange(range);

      expect(captureTextFromWindow(window)).toBe("A much longer selection");
    });
  });

  describe("size limit", () => {
    it("returns empty when the captured text is over the size limit", () => {
      const paragraph = document.createElement("p");
      paragraph.textContent = "a".repeat(MAX_CAPTURE_LENGTH + 1);
      document.body.append(paragraph);
      selectNodeContents(paragraph);
      expect(captureText()).toBe("");
    });

    it("returns empty when fallback text is over the size limit", () => {
      expect(captureText("b".repeat(MAX_CAPTURE_LENGTH + 1))).toBe("");
    });
  });

  describe("output shape", () => {
    it("returns a string, not tokens or chunks", () => {
      document.body.innerHTML = "<p>Hello</p>";
      selectNodeContents(document.querySelector("p")!);
      const result = captureText();
      expect(typeof result).toBe("string");
      expect(Array.isArray(result)).toBe(false);
    });
  });
});
