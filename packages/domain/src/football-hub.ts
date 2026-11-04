import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import type { HubGameRow } from "./hub-game-row";

export type SportFilter = "all" | "padel" | "football";

export const SPORT_FILTER_KEYS: readonly SportFilter[] = [
  "all",
  "padel",
  "football",
];

export function sportFilters(
  locale: Locale,
): { key: SportFilter; label: string }[] {
  const m = messagesFor(locale).common;
  return SPORT_FILTER_KEYS.map((key) => ({ key, label: m[key] }));
}

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

export const FOOTBALL_SECTION_KEYS: readonly FootballSection[] = [
  "result",
  "open",
  "teams",
  "full",
];

export function footballSectionList(locale: Locale): {
  key: FootballSection;
  title: string;
  meta: string;
}[] {
  const m = messagesFor(locale).football.hub.sections;
  return FOOTBALL_SECTION_KEYS.map((key) => ({
    key,
    title: m[key].title,
    meta: m[key].meta,
  }));
}

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

export function footballSections(
  rows: readonly HubGameRow[],
  now: Date,
  locale: Locale,
) {
  return footballSectionList(locale)
    .map((section) => ({
      ...section,
      rows: rows.filter(
        (row) => row.football && footballSection(row, now) === section.key,
      ),
    }))
    .filter((section) => section.rows.length > 0);
}
