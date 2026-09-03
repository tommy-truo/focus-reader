/**
 * Split cleansed text into an ordered list of atomic tokens.
 * Locale defaults to English.
 */
export function tokenize(text: string, _locale = "en"): string[] {
  if (text.trim() === "") {
    return [];
  }

  const tokens: string[] = [];
  let i = 0;

  while (i < text.length) {
    if (/\s/.test(text[i])) {
      i++;
      continue;
    }

    const next = readToken(text, i);
    if (next.token.length > 0) {
      tokens.push(next.token);
      i = next.end;
    } else {
      i++;
    }
  }

  return tokens;
}

function readToken(
  text: string,
  start: number,
): { token: string; end: number } {
  let i = start;
  let token = "";
  let expectedClose: string | null = null;

  const open = text[i];
  if (open === '"' || open === "'" || open === "(") {
    expectedClose = open === "(" ? ")" : open;
    token += open;
    i++;
  }

  if (i < text.length && /\d/.test(text[i])) {
    const numberToken = readNumber(text, i);
    token += numberToken.token;
    i = numberToken.end;

    const suffix = readNumericSuffix(text, i);
    token += suffix.token;
    i = suffix.end;
  } else {
    const wordMatch = text.slice(i).match(/^[A-Za-z]+(?:'[A-Za-z]+)?/);
    if (wordMatch) {
      token += wordMatch[0];
      i += wordMatch[0].length;
    }
  }

  const trailing = readTrailingPunctuation(text, i);
  token += trailing.token;
  i = trailing.end;

  if (expectedClose !== null && i < text.length && text[i] === expectedClose) {
    token += expectedClose;
    i++;

    const afterClose = readTrailingPunctuation(text, i);
    token += afterClose.token;
    i = afterClose.end;
  }

  return { token, end: i };
}

function readNumber(
  text: string,
  start: number,
): { token: string; end: number } {
  const rest = text.slice(start);

  const timeMatch = rest.match(/^(\d+:\d{2})(am|pm)?/i);
  if (timeMatch) {
    const token = timeMatch[1] + (timeMatch[2] ?? "");
    return { token, end: start + token.length };
  }

  const groupedMatch = rest.match(/^(\d{1,3}(?:,\d{3})+)(?:\.(\d+))?/);
  if (groupedMatch) {
    let token = groupedMatch[1];
    if (groupedMatch[2] !== undefined) {
      token += `.${groupedMatch[2]}`;
    }
    return { token, end: start + token.length };
  }

  const decimalMatch = rest.match(/^(\d+\.\d+)/);
  if (decimalMatch) {
    return { token: decimalMatch[1], end: start + decimalMatch[1].length };
  }

  const intMatch = rest.match(/^(\d+)/);
  return { token: intMatch![1], end: start + intMatch![1].length };
}

function readNumericSuffix(
  text: string,
  start: number,
): { token: string; end: number } {
  const match = text.slice(start).match(/^(?:'s|st|nd|rd|th|s)/i);
  if (match === null) {
    return { token: "", end: start };
  }
  return { token: match[0], end: start + match[0].length };
}

function readTrailingPunctuation(
  text: string,
  start: number,
): { token: string; end: number } {
  let i = start;
  let token = "";

  while (i < text.length) {
    if (text.slice(i, i + 3) === "...") {
      token += "...";
      i += 3;
      continue;
    }

    if (",.!?;:')".includes(text[i])) {
      token += text[i];
      i++;
      continue;
    }

    break;
  }

  return { token, end: i };
}
