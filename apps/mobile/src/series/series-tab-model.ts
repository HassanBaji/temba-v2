import { formatGameDay } from "@repo/domain/format-game-start";
import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import { seriesRowLine } from "@repo/domain/series-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "../trpc/react";

export type SeriesTabList = RouterOutputs["series"]["listForGroup"];
type ListRow = SeriesTabList["running"][number];

export type SeriesTabTrailing =
  | { kind: "next"; label: string; date: string }
  | { kind: "ended"; label: string };

export type SeriesTabRow = {
  id: string;
  name: string;
  emblem: SeriesEmblem;
  colour: SeriesColour;
  line: string;
  trailing: SeriesTabTrailing | null;
  spoken: string;
};

export type SeriesTabSection = { meta: string; rows: SeriesTabRow[] };

export type SeriesTabModel = {
  running: SeriesTabSection | null;
  ended: SeriesTabSection | null;
  /** "No series yet.", when the Group has none running or ended. */
  empty: string | null;
  canCreate: boolean;
};

function trailing(row: ListRow, locale: Locale): SeriesTabTrailing | null {
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

function seriesRow(row: ListRow, locale: Locale, now: Date): SeriesTabRow {
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
 * The Group's Series tab (1a): the running Series with "{n} running", then
 * the ended ones with their count, hidden when there are none.
 */
export function seriesTabModel(
  list: SeriesTabList,
  locale: Locale,
  now: Date = new Date(),
): SeriesTabModel {
  const m = messagesFor(locale).series.tab;
  const running = list.running.map((row) => seriesRow(row, locale, now));
  const ended = list.ended.map((row) => seriesRow(row, locale, now));
  return {
    running:
      running.length > 0
        ? { meta: m.running(running.length), rows: running }
        : null,
    ended:
      ended.length > 0 ? { meta: String(ended.length), rows: ended } : null,
    empty: running.length === 0 && ended.length === 0 ? m.empty : null,
    canCreate: list.canManage,
  };
}
