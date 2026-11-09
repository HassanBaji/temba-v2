import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatGameDay } from "./format-game-start";
import { resultMarkLabel, type MatchOutcome } from "./result-mark";

export type HeadToHead = { wins: number; draws: number; losses: number };

export type TeamRivalInput = HeadToHead & {
  teamId: string;
  name: string | null;
  played: number;
  lastResult: MatchOutcome | null;
  lastPlayedAt: Date | string;
};

function showsDraws(sport: string) {
  return sport === "football";
}

/** From this Team's side: "2–1" on padel, wins–draws–losses on football. */
export function headToHeadLine(
  record: HeadToHead,
  sport: string,
  locale: Locale,
) {
  const m = messagesFor(locale).team.rivals;
  return showsDraws(sport)
    ? m.headToHeadWithDraws(record.wins, record.draws, record.losses)
    : m.headToHead(record.wins, record.losses);
}

export function headToHeadSpoken(
  record: HeadToHead,
  sport: string,
  locale: Locale,
) {
  const m = messagesFor(locale).team.rivals;
  return showsDraws(sport)
    ? m.headToHeadSpokenWithDraws(record.wins, record.draws, record.losses)
    : m.headToHeadSpoken(record.wins, record.losses);
}

export function opponentName(name: string | null, locale: Locale) {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }
  return messagesFor(locale).team.rivals.opponentFallback;
}

function lastLine(rival: TeamRivalInput, locale: Locale) {
  const m = messagesFor(locale);
  const day = formatGameDay(rival.lastPlayedAt, locale);
  return rival.lastResult
    ? m.team.rivals.last(resultMarkLabel(rival.lastResult, locale), day)
    : m.team.rivals.last(m.game.history.noScore, day);
}

export function teamRivalRow(
  rival: TeamRivalInput,
  sport: string,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const name = opponentName(rival.name, locale);
  const headToHead = headToHeadLine(rival, sport, locale);
  const played = m.team.rivals.played(rival.played);
  const last = lastLine(rival, locale);
  return {
    teamId: rival.teamId,
    name,
    headToHead,
    played,
    last,
    lastResult: rival.lastResult,
    accessibilityLabel: [
      name,
      headToHeadSpoken(rival, sport, locale),
      played,
      last,
    ].join(m.group.metaSeparator),
  };
}

export type TeamRivalRow = ReturnType<typeof teamRivalRow>;

/** The empty-state line for an opponent played once. */
export function closestRivalLine(
  rival: Pick<TeamRivalInput, "name">,
  locale: Locale,
) {
  return messagesFor(locale).team.rivals.closest(
    opponentName(rival.name, locale),
  );
}
