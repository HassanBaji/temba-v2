import {
  DEFAULT_SPORT,
  SPORTS,
  SPORT_GLYPHS,
  SPORT_LABELS,
  type Sport,
  type SportGlyph,
} from "./sport";

export const COMMUNITY_SPORTS_TITLE = "Sports";
export const COMMUNITY_SPORTS_DESCRIPTION =
  "Club Groups and Teams in this Community can use these sports.";
export const COMMUNITY_SPORT_ADDED_TOAST = "Sport added";
export const COMMUNITY_SPORT_REMOVED_TOAST = "Sport removed";
export const COMMUNITY_CREATE_SPORTS_LABEL = "Sports";
export const COMMUNITY_CREATE_SPORTS_HELP = "Pick at least one.";

export type CommunitySportRow = {
  sport: Sport;
  label: string;
  glyph: SportGlyph;
};

function sportRow(sport: Sport): CommunitySportRow {
  return { sport, label: SPORT_LABELS[sport], glyph: SPORT_GLYPHS[sport] };
}

export function communitySportsView(
  offered: readonly string[],
  canManage: boolean,
) {
  const rows = SPORTS.filter((sport) => offered.includes(sport)).map(sportRow);
  const addable = canManage
    ? SPORTS.filter((sport) => !offered.includes(sport)).map(sportRow)
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
