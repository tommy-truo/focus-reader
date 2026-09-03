/**
 * Turn the current page selection into one string for the pipeline.
 * Lives in page: needs the DOM, not Chrome APIs or chunking.
 */

export const MAX_CAPTURE_LENGTH = 100_000;

const IGNORED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

const BLOCK_TAGS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DD",
  "DIV",
  "DL",
  "DT",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "NAV",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TD",
  "TH",
  "TR",
  "UL",
]);

const TEXT_INPUT_TYPES = new Set([
  "email",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

export function captureText(fallbackText = ""): string {
  return captureTextFromWindow(window, fallbackText);
}

export function captureTextFromWindow(
  targetWindow: Window,
  fallbackText = "",
): string {
  if (isRestrictedLocation(targetWindow.location)) {
    return "";
  }

  const fromDom = longestReachableSelection(targetWindow);
  const text = fromDom !== "" ? fromDom : fallbackText;
  return finalizeCapture(text);
}

function finalizeCapture(text: string): string {
  if (text.trim() === "") {
    return "";
  }
  if (text.length > MAX_CAPTURE_LENGTH) {
    return "";
  }
  return text;
}

function isRestrictedLocation(location: Location): boolean {
  const protocol = location.protocol;
  if (
    protocol === "chrome:" ||
    protocol === "chrome-extension:" ||
    protocol === "about:" ||
    protocol === "devtools:"
  ) {
    return true;
  }

  const host = location.hostname;
  if (host === "chromewebstore.google.com") {
    return true;
  }
  return host === "chrome.google.com" && location.pathname.startsWith("/webstore");
}

function longestReachableSelection(root: Window): string {
  let best = "";
  const seen = new Set<Document>();
  const stack: Window[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) {
      continue;
    }

    let doc: Document;
    try {
      doc = current.document;
    } catch {
      continue;
    }

    if (seen.has(doc)) {
      continue;
    }
    seen.add(doc);

    const local = captureFromDocument(current);
    if (local.length > best.length) {
      best = local;
    }

    try {
      for (let index = 0; index < current.frames.length; index++) {
        try {
          stack.push(current.frames[index]);
        } catch {
          // Cross-origin or detached frame.
        }
      }
    } catch {
      // Frame list unavailable.
    }
  }

  return best;
}

function captureFromDocument(targetWindow: Window): string {
  try {
    const doc = targetWindow.document;
    const fieldText = selectedFieldText(doc.activeElement);
    const selectionText = textFromSelection(targetWindow.getSelection());
    return fieldText.length >= selectionText.length ? fieldText : selectionText;
  } catch {
    return "";
  }
}

function selectedFieldText(element: Element | null): string {
  if (element === null || !isTextField(element)) {
    return "";
  }

  const field = element as HTMLInputElement | HTMLTextAreaElement;
  const start = field.selectionStart;
  const end = field.selectionEnd;
  if (start === null || end === null || start === end) {
    return "";
  }

  return field.value.slice(Math.min(start, end), Math.max(start, end));
}

function isTextField(element: Element): boolean {
  if (element.tagName === "TEXTAREA") {
    return true;
  }
  if (element.tagName !== "INPUT") {
    return false;
  }
  const type = (element as HTMLInputElement).type;
  return TEXT_INPUT_TYPES.has(type);
}

function textFromSelection(selection: Selection | null): string {
  if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) {
    return "";
  }

  const parts: string[] = [];
  for (let index = 0; index < selection.rangeCount; index++) {
    const piece = textFromRange(selection.getRangeAt(index));
    if (piece !== "") {
      parts.push(piece);
    }
  }

  return parts.join("\n\n");
}

function textFromRange(range: Range): string {
  if (range.collapsed) {
    return "";
  }

  const ancestor = range.commonAncestorContainer;
  if (ancestor.nodeType === Node.TEXT_NODE) {
    return sliceTextNode(range, ancestor as Text);
  }

  const doc = ancestor.ownerDocument;
  if (doc === null) {
    return "";
  }

  const walker = doc.createTreeWalker(
    ancestor,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );

  let result = "";
  let pendingBreak = "";
  let lastBlock: Element | null = null;
  let emitted = false;

  const visit = (node: Node): void => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (element.tagName === "BR" && elementIntersectsRange(range, element)) {
        pendingBreak = strongerBreak(pendingBreak, "\n");
      }
      return;
    }

    if (node.nodeType !== Node.TEXT_NODE || isIgnoredText(node)) {
      return;
    }

    const textNode = node as Text;
    if (!textNodeIntersectsRange(range, textNode)) {
      return;
    }

    const piece = sliceTextNode(range, textNode);
    if (piece === "") {
      return;
    }

    const block = nearestBlock(textNode);
    if (emitted) {
      let breakText = pendingBreak;
      pendingBreak = "";
      if (block !== lastBlock) {
        breakText = strongerBreak(breakText, "\n\n");
      }
      result += breakText;
    } else {
      pendingBreak = "";
    }

    result += piece;
    lastBlock = block;
    emitted = true;
  };

  visit(walker.currentNode);
  let next: Node | null;
  while ((next = walker.nextNode())) {
    visit(next);
  }

  return result;
}

function sliceTextNode(range: Range, textNode: Text): string {
  const value = textNode.data;
  let start = 0;
  let end = value.length;
  if (textNode === range.startContainer) {
    start = range.startOffset;
  }
  if (textNode === range.endContainer) {
    end = range.endOffset;
  }
  if (start >= end) {
    return "";
  }
  return value.slice(start, end);
}

function textNodeIntersectsRange(range: Range, textNode: Text): boolean {
  if (textNode.data.length === 0) {
    return false;
  }
  try {
    if (range.comparePoint(textNode, 0) === 1) {
      return false;
    }
    if (range.comparePoint(textNode, textNode.data.length) === -1) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function elementIntersectsRange(range: Range, element: Element): boolean {
  try {
    return range.intersectsNode(element);
  } catch {
    return false;
  }
}

function isIgnoredText(node: Node): boolean {
  let current = node.parentElement;
  while (current) {
    if (IGNORED_TAGS.has(current.tagName)) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function nearestBlock(node: Node): Element | null {
  let current =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;

  while (current) {
    if (current.tagName === "BODY" || current.tagName === "HTML") {
      return null;
    }
    if (BLOCK_TAGS.has(current.tagName)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

function strongerBreak(left: string, right: string): string {
  if (left.includes("\n\n") || right.includes("\n\n")) {
    return "\n\n";
  }
  if (left.includes("\n") || right.includes("\n")) {
    return "\n";
  }
  return "";
}
