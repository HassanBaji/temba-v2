import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type MatchOutcome = "won" | "lost" | "draw";

export type ResultMarkVariant = MatchOutcome | "not-played";

export function resultMarkLabel(variant: ResultMarkVariant, locale: Locale) {
  const m = messagesFor(locale).game.resultMark;
  switch (variant) {
    case "won":
      return m.won;
    case "lost":
      return m.lost;
    case "draw":
      return m.draw;
    case "not-played":
      return m.notPlayed;
  }
}

/** A Match with no outcome to read (no seat, or no score yet) is not played. */
export function resultMarkVariant(
  outcome: MatchOutcome | null | undefined,
): ResultMarkVariant {
  return outcome ?? "not-played";
}
