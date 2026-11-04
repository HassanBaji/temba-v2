import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export const SPORTS = ["padel", "football"] as const;

export type Sport = (typeof SPORTS)[number];

export type SportGlyph = "circle-dot" | "goal";

export const SPORT_GLYPHS: Record<Sport, SportGlyph> = {
  padel: "circle-dot",
  football: "goal",
};

export function isSport(value: unknown): value is Sport {
  return (SPORTS as readonly unknown[]).includes(value);
}

function knownSportLabel(sport: Sport, locale: Locale): string {
  const m = messagesFor(locale).common;
  return sport === "football" ? m.football : m.padel;
}

export function sportLabel(
  sport: string | null | undefined,
  locale: Locale,
): string | null {
  const value = sport?.trim();
  if (!value) {
    return null;
  }
  return isSport(value) ? knownSportLabel(value, locale) : value;
}

export function sportGlyph(
  sport: string | null | undefined,
): SportGlyph | null {
  const value = sport?.trim();
  return isSport(value) ? SPORT_GLYPHS[value] : null;
}

/**
 * The User's Sports played in a fixed order. None recorded means they
 * onboarded before the question existed, which reads as padel only.
 */
export function sportsPlayed(
  sports: readonly string[] | null | undefined,
): Sport[] {
  const played = SPORTS.filter((sport) => sports?.includes(sport));
  return played.length > 0 ? played : ["padel"];
}

export const PUBLIC_GROUP_SPORT_FILTERS = ["all", ...SPORTS] as const;

export type PublicGroupSportFilter =
  (typeof PUBLIC_GROUP_SPORT_FILTERS)[number];

export const DEFAULT_PUBLIC_GROUP_SPORT_FILTER: PublicGroupSportFilter = "all";

export function publicGroupSportFilterLabel(
  filter: PublicGroupSportFilter,
  locale: Locale,
): string {
  return filter === "all"
    ? messagesFor(locale).common.all
    : knownSportLabel(filter, locale);
}

export function publicGroupSportFilterInput(
  filter: PublicGroupSportFilter,
): { sport: Sport } | undefined {
  return filter === "all" ? undefined : { sport: filter };
}

export const DEFAULT_SPORT: Sport = "padel";

export function sportOrDefault(value: string | null | undefined): Sport {
  return isSport(value) ? value : DEFAULT_SPORT;
}
