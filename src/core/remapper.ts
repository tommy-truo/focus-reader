/**
 * Map a reading position onto a rebuilt chunk list.
 */
export function remap(
  oldChunks: readonly string[],
  oldIndex: number,
  newChunks: readonly string[],
): number {
  if (oldChunks.length === 0 || newChunks.length === 0) {
    return 0;
  }

  const clampedIndex = clampIndex(oldIndex, oldChunks.length);
  const offset = tokenCountBefore(oldChunks, clampedIndex);
  return chunkIndexAtOffset(newChunks, offset);
}

function clampIndex(index: number, total: number): number {
  if (index < 0) {
    return 0;
  }
  if (index >= total) {
    return total - 1;
  }
  return index;
}

function tokenCount(chunk: string): number {
  const trimmed = chunk.trim();
  if (trimmed === "") {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function tokenCountBefore(chunks: readonly string[], index: number): number {
  let count = 0;
  for (let i = 0; i < index; i++) {
    count += tokenCount(chunks[i]);
  }
  return count;
}

function chunkIndexAtOffset(chunks: readonly string[], offset: number): number {
  let start = 0;
  for (let i = 0; i < chunks.length; i++) {
    const end = start + tokenCount(chunks[i]);
    if (offset < end) {
      return i;
    }
    start = end;
  }
  return chunks.length - 1;
}
