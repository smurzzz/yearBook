/** Tiny class joiner (RN has no class strings — this joins style arrays). */
export const cx = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(" ");
