import type { HubGameRow } from "./hub-game-row";

export type SportFilter = "all" | "padel" | "football";

export const SPORT_FILTERS: { key: SportFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "padel", label: "Padel" },
  { key: "football", label: "Football" },
];

export function filterBySport<T extends { sport: string | null }>(
  rows: readonly T[],
  filter: SportFilter,
): T[] {
  if (filter === "all") {
    return [...rows];
  }
  return rows.filter((row) => (row.sport ?? "padel") === filter);
}

export type FootballSection = "result" | "open" | "teams" | "full";

export const FOOTBALL_SECTIONS: {
  key: FootballSection;
  title: string;
  meta: string;
}[] = [
  {
    key: "result",
    title: "Needs your confirmation",
    meta: "score in or missing",
  },
  { key: "open", title: "Seats open", meta: "teams not set" },
  { key: "teams", title: "Teams set", meta: "see your team" },
  { key: "full", title: "Full", meta: "waitlist open" },
];

/** A played Game the viewer lined up in still needs its Score agreed. */
export function footballAwaitsResult(row: HubGameRow, now: Date) {
  const football = row.football;
  if (!football || football.matchStatus === "completed") {
    return false;
  }
  if (football.needsViewerConfirmation) {
    return true;
  }
  const played =
    row.windowEnd != null && row.windowEnd.getTime() < now.getTime();
  return (
    played &&
    football.score == null &&
    football.sides != null &&
    football.viewer.sideIndex != null
  );
}

export function footballSection(row: HubGameRow, now: Date): FootballSection {
  if (footballAwaitsResult(row, now)) {
    return "result";
  }
  if (row.football?.sides) {
    return "teams";
  }
  return row.registrationStatus === "full" ? "full" : "open";
}

export function footballSections(rows: readonly HubGameRow[], now: Date) {
  return FOOTBALL_SECTIONS.map((section) => ({
    ...section,
    rows: rows.filter(
      (row) => row.football && footballSection(row, now) === section.key,
    ),
  })).filter((section) => section.rows.length > 0);
}
