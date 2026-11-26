import { formatGameDay } from "@repo/domain/format-game-start";
import { groupDisplayName } from "@repo/domain/group-join";
import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import { seriesRowLine } from "@repo/domain/series-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "../trpc/react";

export type GroupSeriesList = RouterOutputs["series"]["listForGroup"];
type ListRow = GroupSeriesList["running"][number];

export type GroupSeriesTrailing =
  | { kind: "next"; label: string; date: string }
  | { kind: "ended"; label: string };

export type GroupSeriesRow = {
  id: string;
  name: string;
  emblem: SeriesEmblem;
  colour: SeriesColour;
  line: string;
  trailing: GroupSeriesTrailing | null;
  spoken: string;
};

export type GroupSeriesSection = { meta: string; rows: GroupSeriesRow[] };

export type GroupSeriesScreenModel = {
  groupName: string;
  running: GroupSeriesSection | null;
  ended: GroupSeriesSection | null;
  /** "No series yet.", when the Group has none running or ended. */
  empty: string | null;
  canCreate: boolean;
};

function trailing(row: ListRow, locale: Locale): GroupSeriesTrailing | null {
  const m = messagesFor(locale).series.tab;
  if (row.endedAt) {
    return { kind: "ended", label: m.badgesStay };
  }
  if (!row.next?.startsAt) {
    return null;
  }
  return {
    kind: "next",
    label: m.next,
    date: formatGameDay(row.next.startsAt, locale, { weekday: "short" }),
  };
}

function seriesRow(row: ListRow, locale: Locale, now: Date): GroupSeriesRow {
  const line = seriesRowLine(row, locale, now);
  const end = trailing(row, locale);
  const endParts = !end
    ? []
    : end.kind === "next"
      ? [end.label, end.date]
      : [end.label];
  return {
    id: row.id,
    name: row.name,
    emblem: row.emblem,
    colour: row.colour,
    line,
    trailing: end,
    spoken: messagesFor(locale).series.page.rowLabel([
      row.name,
      line,
      ...endParts,
    ]),
  };
}

/**
 * The Group's Series (1a): the running Series, then the ended ones, each with
 * its count and hidden when there are none.
 */
export function groupSeriesScreenModel(
  list: GroupSeriesList,
  locale: Locale,
  now: Date = new Date(),
): GroupSeriesScreenModel {
  const m = messagesFor(locale).series.tab;
  const running = list.running.map((row) => seriesRow(row, locale, now));
  const ended = list.ended.map((row) => seriesRow(row, locale, now));
  return {
    groupName: groupDisplayName(list.groupName, locale),
    running:
      running.length > 0
        ? { meta: String(running.length), rows: running }
        : null,
    ended:
      ended.length > 0 ? { meta: String(ended.length), rows: ended } : null,
    empty: running.length === 0 && ended.length === 0 ? m.empty : null,
    canCreate: list.canManage,
  };
}
