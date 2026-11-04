import type { Locale } from "@repo/i18n/locale";

import {
  DEFAULT_SPORT,
  SPORTS,
  SPORT_GLYPHS,
  sportLabel,
  type Sport,
  type SportGlyph,
} from "./sport";

export type CommunitySportRow = {
  sport: Sport;
  label: string;
  glyph: SportGlyph;
};

function sportRow(sport: Sport, locale: Locale): CommunitySportRow {
  return {
    sport,
    label: sportLabel(sport, locale) ?? sport,
    glyph: SPORT_GLYPHS[sport],
  };
}

export function communitySportsView(
  offered: readonly string[],
  canManage: boolean,
  locale: Locale,
) {
  const rows = SPORTS.filter((sport) => offered.includes(sport)).map((sport) =>
    sportRow(sport, locale),
  );
  const addable = canManage
    ? SPORTS.filter((sport) => !offered.includes(sport)).map((sport) =>
        sportRow(sport, locale),
      )
    : [];
  return { rows, addable, canRemove: canManage };
}

export function toggleCommunitySport(
  selected: readonly Sport[],
  sport: Sport,
): Sport[] {
  const next = selected.includes(sport)
    ? selected.filter((value) => value !== sport)
    : [...selected, sport];
  return SPORTS.filter((value) => next.includes(value));
}

export function clubGroupSportChoice(offered: readonly string[]) {
  const sports = SPORTS.filter((sport) => offered.includes(sport));
  const fallback = sports[0] ?? DEFAULT_SPORT;
  return {
    sports,
    showPicker: sports.length > 1,
    defaultSport: sports.includes(DEFAULT_SPORT) ? DEFAULT_SPORT : fallback,
  };
}
