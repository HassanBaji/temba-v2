import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatMonth } from "./format-game-start";
import type { FootballBib } from "./football-lineup";
import { firstName } from "./game-card";
import { shortPlayerName } from "./player-name";
import { zonedParts } from "./product-timezone";
import type { SeriesWinRule } from "./series";
import type { Sport } from "./sport";

export type SeriesRowLineInput = {
  sport: Sport;
  kind: "social" | "game" | null;
  playedCount: number;
  next: { edition: number } | null;
  endedAt: Date | null;
};

function monthOf(
  date: Date,
  now: Date,
  locale: Locale,
  style: "long" | "short" = "long",
) {
  const month = formatMonth(date, style, locale);
  const { year } = zonedParts(date);
  return year === zonedParts(now).year ? month : `${month} ${year}`;
}

/**
 * The line under a Series on the Group's Series tab (design 1a): its sport and
 * the kind of its most recent Edition, how many Editions were played, then the
 * next Edition's number, or the month it ended.
 */
export function seriesRowLine(
  row: SeriesRowLineInput,
  locale: Locale,
  now: Date = new Date(),
) {
  const m = messagesFor(locale).series.tab;
  const kind = m.rowKind[row.sport][row.kind ?? "none"];
  if (row.endedAt) {
    return m.rowLineEnded(
      kind,
      m.played(row.playedCount),
      monthOf(row.endedAt, now, locale),
    );
  }
  const played =
    row.playedCount === 0 ? m.notPlayedYet : m.played(row.playedCount);
  return row.next
    ? m.rowLineNext(kind, played, row.next.edition)
    : m.rowLine(kind, played);
}

/**
 * The Series page's third figure (design 3b): the month the Series was
 * created, "running since", or the month it ended; the year too when it is
 * not this year.
 */
export function seriesPageSince(
  series: { createdAt: Date; endedAt: Date | null },
  locale: Locale,
  now: Date = new Date(),
) {
  const m = messagesFor(locale).series.page;
  return series.endedAt
    ? { value: monthOf(series.endedAt, now, locale, "short"), label: m.ended }
    : {
        value: monthOf(series.createdAt, now, locale, "short"),
        label: m.runningSince,
      };
}

/**
 * Who won an Edition, in one line: the winning side's Bib colour on a football
 * Game, else one or two short names, else the first two and how many more.
 */
export function seriesWinnersLine(
  winners: readonly { name: string }[],
  winnerBib: FootballBib | null,
  locale: Locale,
) {
  const messages = messagesFor(locale);
  if (winnerBib) {
    return messages.football.lineup.bibs[winnerBib];
  }
  const [first, second] = winners.map((winner) => shortPlayerName(winner.name));
  if (!first) {
    return "";
  }
  if (!second) {
    return first;
  }
  return winners.length === 2
    ? messages.series.game.winnersTwo(first, second)
    : messages.series.game.winnersMore(first, second, winners.length - 2);
}

/** What winning an Edition takes, on the Game's "Part of" card (designs 2b and 2c). */
export function seriesRuleLine(
  rule: SeriesWinRule,
  edition: number,
  locale: Locale,
) {
  const m = messagesFor(locale).series.game;
  return rule === "side" ? m.ruleSide : m.rule[rule](edition);
}

/** Who won the latest earlier Edition, as the "Part of" card's second sentence. */
export function seriesWonLastLine(
  lastWinners: {
    winners: readonly { name: string }[];
    winnerBib: FootballBib | null;
  } | null,
  locale: Locale,
) {
  if (!lastWinners) {
    return null;
  }
  const winners = seriesWinnersLine(
    lastWinners.winners,
    lastWinners.winnerBib,
    locale,
  );
  return winners ? messagesFor(locale).series.game.wonLast(winners) : null;
}

/** A winner's nth win of a Series: "Qasim’s 3rd", or "Your 2nd" with no name. */
export function seriesWinOrdinal(
  name: string | null,
  n: number,
  locale: Locale,
) {
  const m = messagesFor(locale).series.win;
  return name ? m.ordinal(name, n) : m.yourOrdinal(n);
}

export type SeriesWinTally = {
  tally: "new" | "most" | "level" | null;
  levelWith: { name: string } | { count: number } | null;
};

/** Where a win leaves its winner among the Series' winners, or null. */
export function seriesWinTally(winner: SeriesWinTally, locale: Locale) {
  const m = messagesFor(locale).series.win;
  switch (winner.tally) {
    case "new":
      return m.tallyNew;
    case "most":
      return m.tallyMost;
    case "level":
      if (winner.levelWith && "name" in winner.levelWith) {
        return m.tallyLevelWith(firstName(winner.levelWith.name));
      }
      return winner.levelWith
        ? m.tallyLevelWithCount(winner.levelWith.count)
        : m.tallyMost;
    default:
      return null;
  }
}

export type SeriesWinWith = {
  names: readonly string[];
  bib: FootballBib | null;
  score: { mine: number; theirs: number } | null;
};

/**
 * Who a win was won with: the partner on a two-player team, or the side's Bib
 * colour and the score on a football Game. Null when there is nobody to name.
 */
export function seriesWinWho(
  partners: SeriesWinWith,
  form: "full" | "short",
  locale: Locale,
) {
  const messages = messagesFor(locale);
  if (partners.bib) {
    const bib = messages.football.lineup.bibs[partners.bib];
    return partners.score
      ? messages.series.profile.bibScore(
          bib,
          partners.score.mine,
          partners.score.theirs,
        )
      : bib;
  }
  const [partner] = partners.names;
  if (!partner) {
    return null;
  }
  return form === "short" ? shortPlayerName(partner) : partner;
}

/** A win's row on the badge sheet: "With Khalid Janahi", "With Black, 5–3". */
export function seriesWinWithLine(partners: SeriesWinWith, locale: Locale) {
  const who = seriesWinWho(partners, "full", locale);
  return who ? messagesFor(locale).series.profile.with(who) : null;
}
