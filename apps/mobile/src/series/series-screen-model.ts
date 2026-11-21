import { formatGameDay } from "@repo/domain/format-game-start";
import { seriesPageSince, seriesWinnersLine } from "@repo/domain/series-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "../trpc/react";

export type SeriesScreenData = RouterOutputs["series"]["byId"];
type Edition = SeriesScreenData["editions"][number];
type Winner = SeriesScreenData["mostWins"][number];

/** Most wins and Editions show this many rows before "All N". */
export const SERIES_SCREEN_ROWS = 4;

export type SeriesFigure = { value: string; label: string };

export type SeriesWinnerRow = {
  userId: string;
  name: string;
  image: string | null;
  line: string;
  wins: string;
  isViewer: boolean;
  spoken: string;
};

export type SeriesEditionRow = {
  gameId: string;
  edition: string;
  line: string;
  date: string;
  hatched: boolean;
  spoken: string;
};

export type SeriesRowList<Row> = {
  rows: Row[];
  /** "All N", shown while more than four rows are folded away. */
  more: string | null;
};

export type SeriesScreenModel = {
  figures: [SeriesFigure, SeriesFigure, SeriesFigure];
  /** Null when nobody has won an Edition. */
  mostWins: (SeriesRowList<SeriesWinnerRow> & { of: string }) | null;
  /** Null when the Series has no Edition; `empty` is shown instead. */
  editions: SeriesRowList<SeriesEditionRow> | null;
  empty: string | null;
  /** The End series confirmation, when the viewer may end it. */
  end: { title: string; description: string; confirm: string } | null;
};

export type SeriesScreenExpanded = { winners: boolean; editions: boolean };

function fold<Row>(
  rows: Row[],
  expanded: boolean,
  more: (n: number) => string,
): SeriesRowList<Row> {
  if (expanded || rows.length <= SERIES_SCREEN_ROWS) {
    return { rows, more: null };
  }
  return { rows: rows.slice(0, SERIES_SCREEN_ROWS), more: more(rows.length) };
}

function winnerRow(winner: Winner, locale: Locale): SeriesWinnerRow {
  const m = messagesFor(locale).series.page;
  const line = winner.isViewer
    ? m.youLastWon(winner.lastWonEdition)
    : m.lastWon(winner.lastWonEdition);
  return {
    userId: winner.userId,
    name: winner.name,
    image: winner.image,
    line,
    wins: String(winner.wins),
    isViewer: winner.isViewer,
    spoken: m.rowLabel([winner.name, line, m.wins(winner.wins)]),
  };
}

function editionLine(edition: Edition, locale: Locale) {
  const m = messagesFor(locale).series.page;
  switch (edition.state) {
    case "upcoming":
      return m.notPlayedYet;
    case "awaiting":
      return m.noResultYet;
    case "no_winner":
      return m.nobodyWon;
    case "won":
      return seriesWinnersLine(edition.winners, edition.winnerBib, locale);
  }
}

function editionRow(edition: Edition, locale: Locale): SeriesEditionRow {
  const m = messagesFor(locale).series.page;
  const line = editionLine(edition, locale);
  const date = edition.startsAt
    ? formatGameDay(edition.startsAt, locale, { weekday: "short" })
    : "";
  return {
    gameId: edition.gameId,
    edition: String(edition.edition),
    line,
    date,
    hatched: edition.state === "upcoming",
    spoken: m.rowLabel(
      [m.edition(edition.edition), line, date].filter(Boolean),
    ),
  };
}

/**
 * The Series screen (3b): three figures, Most wins and the Editions newest
 * first, each folded to four rows until expanded in place.
 */
export function seriesScreenModel(
  series: SeriesScreenData,
  expanded: SeriesScreenExpanded,
  locale: Locale,
  now: Date = new Date(),
): SeriesScreenModel {
  const m = messagesFor(locale).series.page;
  const winners = series.mostWins.map((winner) => winnerRow(winner, locale));
  const editions = series.editions.map((edition) =>
    editionRow(edition, locale),
  );
  return {
    figures: [
      {
        value: String(series.playedCount),
        label: m.played(series.playedCount),
      },
      {
        value: String(series.differentWinners),
        label: m.differentWinners(series.differentWinners),
      },
      seriesPageSince(series, locale, now),
    ],
    mostWins:
      winners.length > 0
        ? {
            ...fold(winners, expanded.winners, m.allWinners),
            of: m.of(series.playedCount),
          }
        : null,
    editions:
      editions.length > 0
        ? fold(editions, expanded.editions, m.allEditions)
        : null,
    empty: editions.length === 0 ? m.empty : null,
    end: series.canEnd
      ? {
          title: m.endTitle(series.name),
          description: editions.length === 0 ? m.endRemoves : m.endConfirm,
          confirm: m.end,
        }
      : null,
  };
}
