/**
 * Track which chunk is currently shown in a reading session.
 */
export interface Navigator {
  readonly current: string;
  readonly index: number;
  readonly total: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  next(): undefined;
  prev(): undefined;
}

function clampIndex(index: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  if (index < 0) {
    return 0;
  }
  if (index >= total) {
    return total - 1;
  }
  return index;
}

export function createNavigator(
  chunks: readonly string[],
  startIndex = 0,
): Navigator {
  let index = clampIndex(startIndex, chunks.length);

  return {
    get current() {
      return chunks[index] ?? "";
    },
    get index() {
      return index;
    },
    get total() {
      return chunks.length;
    },
    get isFirst() {
      return index === 0;
    },
    get isLast() {
      return chunks.length === 0 || index === chunks.length - 1;
    },
    next() {
      if (index < chunks.length - 1) {
        index++;
      }
      return undefined;
    },
    prev() {
      if (index > 0) {
        index--;
      }
      return undefined;
    },
  };
}
