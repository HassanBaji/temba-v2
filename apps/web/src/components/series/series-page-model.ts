import { formatGameDay } from "@repo/domain/format-game-start";
import { seriesSmallBadgeCount, seriesWinnerRanks } from "@repo/domain/series";
import {
  seriesEditionFieldLine,
  seriesNextEditionLines,
  seriesPageSince,
  seriesViewerLine,
  seriesWinnerLine,
  seriesWinnersLine,
} from "@repo/domain/series-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { gameHomeHref, playerProfilePath } from "~/lib/dashboard-paths";
import type { RouterOutputs } from "~/trpc/react";

export type SeriesPageData = RouterOutputs["series"]["byId"];
type Edition = SeriesPageData["editions"][number];
type Winner = SeriesPageData["mostWins"][number];

/** Winners and Editions show this many rows before "All N". */
export const SERIES_PAGE_ROWS = 4;

/** An Edition row shows at most this many winners' squares. */
const EDITION_SQUARES = 3;

export type SeriesFigure = { value: string; label: string };

export type SeriesPerson = {
  key: string;
  name: string;
  image: string | null;
  isViewer: boolean;
};

export type SeriesHolders = {
  people: SeriesPerson[];
  names: string[];
  since: string;
};

export type SeriesNextCard = {
  href: string;
  edition: string;
  editionWord: string;
  title: string;
  line: string;
  action: string;
};

export type SeriesYouCard = {
  person: SeriesPerson;
  title: string;
  line: string;
  badges: number;
  wins: string;
  winsSpoken: string;
};

export type SeriesWinnerRow = {
  userId: string;
  person: SeriesPerson;
  href: string;
  name: string;
  line: string;
  rank: string;
  rankSpoken: string;
  badges: number;
  wins: string;
  winsSpoken: string;
  isViewer: boolean;
};

export type SeriesEditionRow = {
  gameId: string;
  href: string;
  edition: string;
  editionSpoken: string;
  people: SeriesPerson[];
  names: string[];
  meta: string;
};

export type SeriesRowList<Row> = {
  rows: Row[];
  /** "All N", shown while more than four rows are folded away. */
  more: string | null;
};

export type SeriesPageModel = {
  figures: [SeriesFigure, SeriesFigure, SeriesFigure];
  /** Null while nobody has won an Edition. */
  holders: SeriesHolders | null;
  /** Null with no Edition still to be decided, or once the Series ended. */
  next: SeriesNextCard | null;
  you: SeriesYouCard;
  /** Null when nobody has won an Edition. */
  winners: (SeriesRowList<SeriesWinnerRow> & { meta: string }) | null;
  /** The decided Editions newest first; null with none. */
  editions: (SeriesRowList<SeriesEditionRow> & { meta: string }) | null;
  /** Shown when there is neither a decided nor a next Edition. */
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

function displayName(
  person: { name: string; isViewer: boolean },
  locale: Locale,
) {
  return person.isViewer
    ? messagesFor(locale).series.page.viewerName(person.name)
    : person.name;
}

function winnerRow(
  winner: Winner,
  rank: number,
  locale: Locale,
): SeriesWinnerRow {
  const m = messagesFor(locale).series.page;
  return {
    userId: winner.userId,
    person: {
      key: winner.userId,
      name: winner.name,
      image: winner.image,
      isViewer: winner.isViewer,
    },
    href: playerProfilePath(winner.userId),
    name: displayName(winner, locale),
    line: seriesWinnerLine(winner, locale),
    rank: String(rank),
    rankSpoken: m.rank(rank),
    badges: seriesSmallBadgeCount(winner.wins),
    wins: String(winner.wins),
    winsSpoken: m.wins(winner.wins),
    isViewer: winner.isViewer,
  };
}

function editionNames(edition: Edition, locale: Locale) {
  if (edition.state !== "won") {
    return [messagesFor(locale).series.page.nobodyWon];
  }
  if (edition.winnerBib) {
    return [seriesWinnersLine(edition.winners, edition.winnerBib, locale)];
  }
  return edition.winners.map((winner) => displayName(winner, locale));
}

function editionRow(edition: Edition, locale: Locale): SeriesEditionRow {
  const m = messagesFor(locale).series.page;
  const day = edition.startsAt
    ? formatGameDay(edition.startsAt, locale, { weekday: "short" })
    : null;
  const field = seriesEditionFieldLine(edition, locale);
  return {
    gameId: edition.gameId,
    href: gameHomeHref(edition.gameId),
    edition: String(edition.edition),
    editionSpoken: m.edition(edition.edition),
    people: edition.winners.slice(0, EDITION_SQUARES).map((winner) => ({
      key: winner.userId,
      name: winner.name,
      image: winner.image,
      isViewer: winner.isViewer,
    })),
    names: editionNames(edition, locale),
    meta: day && field ? m.editionMeta(day, field) : (day ?? field ?? ""),
  };
}

function holdersOf(
  holders: SeriesPageData["holders"],
  locale: Locale,
): SeriesHolders | null {
  if (!holders) {
    return null;
  }
  return {
    people: holders.players.map((player) => ({
      key: player.userId,
      name: player.name,
      image: player.image,
      isViewer: player.isViewer,
    })),
    names: holders.players.map((player) => displayName(player, locale)),
    since: messagesFor(locale).series.page.sinceEdition(holders.edition),
  };
}

function nextOf(
  next: SeriesPageData["nextEdition"],
  locale: Locale,
  now: Date,
): SeriesNextCard | null {
  if (!next) {
    return null;
  }
  const messages = messagesFor(locale).series;
  return {
    href: gameHomeHref(next.gameId),
    edition: String(next.edition),
    editionWord: messages.noun.edition,
    ...seriesNextEditionLines(next, locale, now),
    action: messages.page.openGame,
  };
}

function youOf(viewer: SeriesPageData["viewer"], locale: Locale) {
  const m = messagesFor(locale).series.page;
  return {
    person: {
      key: "viewer",
      name: viewer.name,
      image: viewer.image,
      isViewer: true,
    },
    title: m.you,
    line: seriesViewerLine(viewer, locale),
    badges: seriesSmallBadgeCount(viewer.wins),
    wins: String(viewer.wins),
    winsSpoken: m.wins(viewer.wins),
  };
}

/**
 * The Series page (design 05): the holders and three figures, the next
 * Edition, the viewer's own line, Winners ranked with ties sharing a rank,
 * and the decided Editions newest first, each list folded to four rows until
 * expanded in place.
 */
export function seriesPageModel(
  series: SeriesPageData,
  expanded: SeriesPageExpanded,
  locale: Locale,
  now: Date = new Date(),
): SeriesPageModel {
  const m = messagesFor(locale).series.page;
  const ranks = seriesWinnerRanks(series.mostWins.map((row) => row.wins));
  const winners = series.mostWins.map((winner, index) =>
    winnerRow(winner, ranks[index] ?? index + 1, locale),
  );
  const editions = series.editions
    .filter(
      (edition) => edition.state === "won" || edition.state === "no_winner",
    )
    .map((edition) => editionRow(edition, locale));
  const next = nextOf(series.nextEdition, locale, now);
  return {
    figures: [
      {
        value: String(series.playedCount),
        label: m.editionsPlayed(series.playedCount),
      },
      {
        value: String(series.differentWinners),
        label: m.playersWon(series.differentWinners),
      },
      seriesPageSince(series, locale, now),
    ],
    holders: holdersOf(series.holders, locale),
    next,
    you: youOf(series.viewer, locale),
    winners:
      winners.length > 0
        ? {
            ...fold(winners, expanded.winners, m.allWinners),
            meta: m.winnersMeta(series.playedCount),
          }
        : null,
    editions:
      editions.length > 0
        ? {
            ...fold(editions, expanded.editions, m.allEditions),
            meta:
              editions.length > 1
                ? m.newestFirst
                : m.editionsMeta(editions.length),
          }
        : null,
    empty: editions.length === 0 && next === null ? m.empty : null,
    end: seriesEndConfirmation(series, locale),
  };
}

/** The End series confirmation, when the viewer may end it. */
export function seriesEndConfirmation(
  series: Pick<SeriesPageData, "name" | "canEnd" | "endRemoves">,
  locale: Locale,
) {
  const m = messagesFor(locale).series.page;
  return series.canEnd
    ? {
        title: m.endTitle(series.name),
        description: series.endRemoves ? m.endRemoves : m.endConfirm,
        confirm: m.end,
      }
    : null;
}
