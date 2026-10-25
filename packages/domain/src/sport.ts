export const SPORTS = ["padel", "football"] as const;

export type Sport = (typeof SPORTS)[number];

export const SPORT_LABELS: Record<Sport, string> = {
  padel: "Padel",
  football: "Football",
};

export type SportGlyph = "circle-dot" | "goal";

export const SPORT_GLYPHS: Record<Sport, SportGlyph> = {
  padel: "circle-dot",
  football: "goal",
};

export function isSport(value: unknown): value is Sport {
  return (SPORTS as readonly unknown[]).includes(value);
}

export function sportLabel(sport: string | null | undefined): string | null {
  const value = sport?.trim();
  if (!value) {
    return null;
  }
  return isSport(value) ? SPORT_LABELS[value] : value;
}

export function sportGlyph(
  sport: string | null | undefined,
): SportGlyph | null {
  const value = sport?.trim();
  return isSport(value) ? SPORT_GLYPHS[value] : null;
}

export const PUBLIC_GROUP_SPORT_FILTERS = ["all", ...SPORTS] as const;

export type PublicGroupSportFilter =
  (typeof PUBLIC_GROUP_SPORT_FILTERS)[number];

export const DEFAULT_PUBLIC_GROUP_SPORT_FILTER: PublicGroupSportFilter = "all";

export function publicGroupSportFilterLabel(
  filter: PublicGroupSportFilter,
): string {
  return filter === "all" ? "All" : SPORT_LABELS[filter];
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
