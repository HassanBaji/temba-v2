export type ScorePairValue = { own: string; other: string };

const PAIR = /^(\d+)–(\d+)$/;

/**
 * Splits a domain score such as "6–4 7–5" into its pairs, own number first,
 * so each pair can be laid out in the row and mirror with it. Null when the
 * text is not only scores ("2–1 in sets", "No score yet").
 */
export function scorePairs(score: string): ScorePairValue[] | null {
  const tokens = score.trim().split(/\s+/);
  const pairs: ScorePairValue[] = [];
  for (const token of tokens) {
    const match = PAIR.exec(token);
    if (!match) {
      return null;
    }
    pairs.push({ own: match[1]!, other: match[2]! });
  }
  return pairs;
}
