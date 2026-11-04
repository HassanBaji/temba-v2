const ARABIC_ARTICLE = "ال";

/** A name word's first letter, read past the Arabic article: "الخليفة" -> "خ". */
export function nameInitial(word: string): string | undefined {
  const letters = Array.from(word);
  if (word.startsWith(ARABIC_ARTICLE) && letters.length > 2) {
    return letters[2];
  }
  return letters[0];
}

/**
 * "Sofia Lindqvist" -> "Sofia L", so a two-name team label stays on one line.
 * Shared by the Games hub History card and the Group Played rows, which draw
 * the same seat names in the same width.
 */
export function shortPlayerName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const first = parts[0];
  if (!first) {
    return name;
  }
  if (parts.length === 1) {
    return first;
  }
  const surnameInitial = nameInitial(parts[parts.length - 1]!);
  return surnameInitial ? `${first} ${surnameInitial.toUpperCase()}` : first;
}
