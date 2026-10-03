export type MatchOutcome = "won" | "lost" | "draw";

export type ResultMarkVariant = MatchOutcome | "not-played";

export const RESULT_MARK_LABEL: Record<ResultMarkVariant, string> = {
  won: "Won",
  lost: "Lost",
  draw: "Draw",
  "not-played": "Not played",
};

/** A Match with no outcome to read (no seat, or no score yet) is not played. */
export function resultMarkVariant(
  outcome: MatchOutcome | null | undefined,
): ResultMarkVariant {
  return outcome ?? "not-played";
}
