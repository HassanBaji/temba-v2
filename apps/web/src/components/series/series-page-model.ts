import { formatGameDay } from "@repo/domain/format-game-start";
import { seriesPageSince, seriesWinnersLine } from "@repo/domain/series-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { gameHomeHref, playerProfilePath } from "~/lib/dashboard-paths";
import type { RouterOutputs } from "~/trpc/react";

export type SeriesPageData = RouterOutputs["series"]["byId"];
type Edition = SeriesPageData["editions"][number];
type Winner = SeriesPageData["mostWins"][number];

/** Most wins and Editions show this many rows before "All N". */
export const SERIES_PAGE_ROWS = 4;

export type SeriesFigure = { value: string; label: string };

export type SeriesWinnerRow = {
  userId: string;
  name: string;
  image: string | null;
  href: string;
  line: string;
  wins: string;
  winsSpoken: string;
  isViewer: boolean;
};

export type SeriesEditionRow = {
  gameId: string;
  href: string;
  edition: string;
  editionSpoken: string;
  line: string;
  date: string;
  hatched: boolean;
};

export type SeriesRowList<Row> = {
  rows: Row[];
  /** "All N", shown while more than four rows are folded away. */
  more: string | null;
};

export type SeriesPageModel = {
  figures: [SeriesFigure, SeriesFigure, SeriesFigure];
  /** Null when nobody has won an Edition. */
  mostWins: (SeriesRowList<SeriesWinnerRow> & { of: string }) | null;
  /** Null when the Series has no Edition; `empty` is shown instead. */
  editions: SeriesRowList<SeriesEditionRow> | null;
  empty: string | null;
  /** The End series confirmation, when the viewer may end it. */
  end: { title: string; description: string; confirm: string } | null;
};

export type SeriesPageExpanded = { winners: boolean; editions: boolean };

function fold<Row>(
  rows: Row[],
  expanded: boolean,
  more: (n: number) => string,
): SeriesRowList<Row> {
  if (expanded || rows.length <= SERIES_PAGE_ROWS) {
    return { rows, more: null };
  }
  return { rows: rows.slice(0, SERIES_PAGE_ROWS), more: more(rows.length) };
}

function winnerRow(winner: Winner, locale: Locale): SeriesWinnerRow {
  const m = messagesFor(locale).series.page;
  return {
    userId: winner.userId,
    name: winner.name,
    image: winner.image,
    href: playerProfilePath(winner.userId),
    line: winner.isViewer
      ? m.youLastWon(winner.lastWonEdition)
      : m.lastWon(winner.lastWonEdition),
    wins: String(winner.wins),
    winsSpoken: m.wins(winner.wins),
    isViewer: winner.isViewer,
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
  return {
    gameId: edition.gameId,
    href: gameHomeHref(edition.gameId),
    edition: String(edition.edition),
    editionSpoken: messagesFor(locale).series.page.edition(edition.edition),
    line: editionLine(edition, locale),
    date: edition.startsAt
      ? formatGameDay(edition.startsAt, locale, { weekday: "short" })
      : "",
    hatched: edition.state === "upcoming",
  };
}

/**
 * The Series page (3b): three figures, Most wins and the Editions newest
 * first, each folded to four rows until expanded in place.
 */
export function seriesPageModel(
  series: SeriesPageData,
  expanded: SeriesPageExpanded,
  locale: Locale,
  now: Date = new Date(),
): SeriesPageModel {
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
