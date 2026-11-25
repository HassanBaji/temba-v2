import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export const GAME_GENDER_TAGS = ["men", "women", "mixed"] as const;

export type GameGenderTag = (typeof GAME_GENDER_TAGS)[number];

export function isGameGenderTag(value: unknown): value is GameGenderTag {
  return (GAME_GENDER_TAGS as readonly unknown[]).includes(value);
}

/** Null for a Game with no Gender tag, so callers render nothing. */
export function gameGenderTagLabel(
  tag: string | null | undefined,
  locale: Locale,
) {
  return isGameGenderTag(tag)
    ? messagesFor(locale).createGame.genderTag[tag]
    : null;
}
