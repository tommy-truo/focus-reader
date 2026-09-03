/**
 * Flatten captured text for the tokenizer.
 */
export function cleanseText(text: string): string {
  if (text.trim() === "") {
    return "";
  }

  return text
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}
