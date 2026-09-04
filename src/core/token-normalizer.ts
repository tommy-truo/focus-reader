const TITLES = new Set(["Dr.", "Mr.", "Mrs.", "Ms.", "Prof."]);
const SUFFIXES = new Set(["Jr.", "Sr."]);

const ABBREVIATION_PAIRS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "U.": { "S.": "U.S.", "K.": "U.K." },
  "e.": { "g.": "e.g." },
  "i.": { "e.": "i.e." },
};

type JoinResult = { consumed: number; merged: string };
type JoinRule = (tokens: readonly string[], index: number) => JoinResult | null;

const NAME_CORE_BLOCKLIST = new Set([
  "Dr",
  "Mr",
  "Mrs",
  "Ms",
  "Prof",
  "Jr",
  "Sr",
]);

const NAME_CORE_PATTERN = /^[A-Z][a-zA-Z]*(?:'[A-Za-z]*)?$/;

function stripWrapping(token: string): string {
  if (token.length < 2) {
    return token;
  }

  const open = token[0];
  if (open === '"' || open === "'" || open === "(") {
    const close = open === "(" ? ")" : open;
    if (token[token.length - 1] === close) {
      return token.slice(1, -1);
    }
  }

  return token;
}

function stripTrailingPunctuation(token: string): string {
  let result = token;
  if (result.endsWith("...")) {
    result = result.slice(0, -3);
  }
  return result.replace(/[,.!?;:]+$/, "");
}

function isCapitalizedName(token: string): boolean {
  const inner = stripWrapping(token);
  const core = stripTrailingPunctuation(inner);

  if (!NAME_CORE_PATTERN.test(core)) {
    return false;
  }

  const stem = core.replace(/'[A-Za-z]*$/, "");
  return !NAME_CORE_BLOCKLIST.has(stem);
}

function isClockTime(token: string): boolean {
  return /^\d+:\d{2}$/.test(token);
}

function isMeridiem(token: string): boolean {
  return /^(AM|PM|am|pm|a\.m\.|p\.m\.)$/.test(token);
}

function tryTitleNameSuffix(
  tokens: readonly string[],
  index: number,
): JoinResult | null {
  const title = tokens[index];
  if (!TITLES.has(title)) {
    return null;
  }

  const name = tokens[index + 1];
  if (name === undefined || !isCapitalizedName(name)) {
    return null;
  }

  const suffix = tokens[index + 2];
  if (suffix !== undefined && SUFFIXES.has(suffix)) {
    return {
      consumed: 3,
      merged: `${title} ${name} ${suffix}`,
    };
  }

  return {
    consumed: 2,
    merged: `${title} ${name}`,
  };
}

function tryNameSuffix(
  tokens: readonly string[],
  index: number,
): JoinResult | null {
  const name = tokens[index];
  if (!isCapitalizedName(name)) {
    return null;
  }

  const suffix = tokens[index + 1];
  if (suffix === undefined || !SUFFIXES.has(suffix)) {
    return null;
  }

  return {
    consumed: 2,
    merged: `${name} ${suffix}`,
  };
}

function tryTimeMeridiem(
  tokens: readonly string[],
  index: number,
): JoinResult | null {
  const time = tokens[index];
  if (!isClockTime(time)) {
    return null;
  }

  const next = tokens[index + 1];
  if (next === undefined) {
    return null;
  }

  if (isMeridiem(next)) {
    return {
      consumed: 2,
      merged: `${time} ${next}`,
    };
  }

  const afterNext = tokens[index + 2];
  if (next === "a." && afterNext === "m.") {
    return {
      consumed: 3,
      merged: `${time} a.m.`,
    };
  }

  if (next === "p." && afterNext === "m.") {
    return {
      consumed: 3,
      merged: `${time} p.m.`,
    };
  }

  return null;
}

function tryAbbreviation(
  tokens: readonly string[],
  index: number,
): JoinResult | null {
  const first = tokens[index];
  const second = tokens[index + 1];
  if (second === undefined) {
    return null;
  }

  const targets = ABBREVIATION_PAIRS[first];
  if (targets === undefined) {
    return null;
  }

  const merged = targets[second];
  if (merged === undefined) {
    return null;
  }

  return { consumed: 2, merged };
}

const JOIN_RULES: readonly JoinRule[] = [
  tryTitleNameSuffix,
  tryNameSuffix,
  tryTimeMeridiem,
  tryAbbreviation,
];

/**
 * Fuse title+name, name+Sr./Jr., time, and abbreviation fragments
 * in a single left-to-right pass.
 */
export function normalizeTokens(tokens: readonly string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    let joined = false;

    for (const rule of JOIN_RULES) {
      const match = rule(tokens, i);
      if (match !== null) {
        result.push(match.merged);
        i += match.consumed;
        joined = true;
        break;
      }
    }

    if (!joined) {
      result.push(tokens[i]);
      i++;
    }
  }

  return result;
}
