import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatMonth } from "./format-game-start";
import type { FootballBib } from "./football-lineup";
import { shortPlayerName } from "./player-name";
import { zonedParts } from "./product-timezone";
import type { Sport } from "./sport";

export type SeriesRowLineInput = {
  sport: Sport;
  kind: "social" | "game" | null;
  playedCount: number;
  next: { edition: number } | null;
  endedAt: Date | null;
};

function monthOf(date: Date, now: Date, locale: Locale) {
  const month = formatMonth(date, "long", locale);
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
