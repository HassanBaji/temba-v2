import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatPricePerPlayerFils } from "./price-per-player";
import {
  headToHeadLine,
  headToHeadSpoken,
  opponentName,
  type HeadToHead,
} from "./team-rivals";

export type ChallengeTeamSide = {
  name: string | null;
  initials: string;
  record: HeadToHead;
  /** From this side's view; null when the Teams have not played a completed Match. */
  headToHead: HeadToHead | null;
};

const PADEL_PLAYERS = 4;

function isFootball(sport: string | null) {
  return sport === "football";
}

function recordSpoken(
  record: HeadToHead,
  sport: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).team;
  return isFootball(sport)
    ? m.recordSpokenWithDraws(record.wins, record.draws, record.losses)
    : m.recordSpoken(record.wins, record.losses);
}

/** "Head-to-head 2–1" from the first Team's side, or "First meeting". */
export function challengeHeadToHeadLine(
  headToHead: HeadToHead | null,
  sport: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.gameDetails;
  return headToHead
    ? m.headToHead(headToHeadLine(headToHead, sport ?? "padel", locale))
    : m.firstMeeting;
}

/**
 * The team-vs-team row: each Team's crest initials, name and record, and the
 * head-to-head read from the first Team's side.
 */
export function challengeTeamVsTeamView(
  sides: readonly ChallengeTeamSide[],
  sport: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const teamCopy = m.challenge.teams;
  const team = (side: ChallengeTeamSide | undefined) => {
    const name = opponentName(side?.name ?? null, locale);
    const record = side?.record ?? { wins: 0, draws: 0, losses: 0 };
    return {
      name,
      initials: side?.initials ?? "",
      recordLabel: isFootball(sport)
        ? teamCopy.recordWithDraws
        : teamCopy.record,
      recordValue: headToHeadLine(record, sport ?? "padel", locale),
      recordSpoken: recordSpoken(record, sport, locale),
    };
  };
  const home = team(sides[0]);
  const away = team(sides[1]);
  const headToHead = sides[0]?.headToHead ?? null;
  const headToHeadLineText = challengeHeadToHeadLine(headToHead, sport, locale);
  const headToHeadA11y = headToHead
    ? headToHeadSpoken(headToHead, sport ?? "padel", locale)
    : headToHeadLineText;
  return {
    home,
    away,
    title: m.challenge.gameDetails.teamVsTeam(home.name, away.name),
    headToHeadLine: headToHeadLineText,
    accessibilityLabel: [
      m.challenge.gameDetails.teamVsTeam(home.name, away.name),
      `${home.name}${m.group.metaSeparator}${home.recordSpoken}`,
      `${away.name}${m.group.metaSeparator}${away.recordSpoken}`,
      headToHeadA11y,
    ].join(m.group.metaSeparator),
  };
}

/**
 * "1.500 BD each, pay at the venue" from the Proposal's price; with none,
 * padel splits the court between its players and football pays at the venue.
 */
export function challengeCostLine(
  input: {
    sport: string | null;
    pricePerPlayerFils: number | null;
    playerCount?: number;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).challenge;
  const price = formatPricePerPlayerFils(input.pricePerPlayerFils, locale);
  if (price != null) {
    return input.pricePerPlayerFils === 0
      ? price
      : m.detail.game.costEach(price);
  }
  if (isFootball(input.sport)) {
    return m.detail.game.costAtVenue;
  }
  const players = input.playerCount ?? PADEL_PLAYERS;
  return players === PADEL_PLAYERS
    ? m.detail.game.costSplit
    : m.gameDetails.costSplitWays(players);
}

/** Football counts for both records and the named; padel also moves Levels. */
export function challengeCountsForLine(sport: string | null, locale: Locale) {
  const m = messagesFor(locale).challenge.gameDetails.countsForLine;
  return isFootball(sport) ? m.football : m.padel;
}

export type ChallengeDetailsRow = {
  key: "from" | "agreed" | "place" | "cost" | "counts";
  label: string;
  value: string;
  hint: string | null;
};

/** The details rows of a Challenge Game, in the mockup's order. */
export function challengeGameDetailsRows(
  input: {
    sport: string | null;
    postedByTeamName: string | null;
    proposedByName: string | null;
    confirmedByName: string | null;
    venueName: string | null;
    courtName: string | null;
    costLine: string;
  },
  locale: Locale,
): ChallengeDetailsRow[] {
  const m = messagesFor(locale);
  const copy = m.challenge.gameDetails;
  const game = m.challenge.detail.game;
  const fallback = m.team.memberFallback;
  const place =
    input.venueName && input.courtName
      ? game.place(input.venueName, input.courtName)
      : (input.venueName ?? input.courtName ?? "");
  return [
    {
      key: "from",
      label: copy.from,
      value: copy.fromChallenge(opponentName(input.postedByTeamName, locale)),
      hint: null,
    },
    {
      key: "agreed",
      label: copy.agreed,
      value: game.proposedConfirmed(
        input.proposedByName ?? fallback,
        input.confirmedByName ?? fallback,
      ),
      hint: null,
    },
    {
      key: "place",
      label: isFootball(input.sport) ? game.pitch : game.court,
      value: place,
      hint: game.bookYourselves,
    },
    { key: "cost", label: game.cost, value: input.costLine, hint: null },
    {
      key: "counts",
      label: copy.countsFor,
      value: challengeCountsForLine(input.sport, locale),
      hint: null,
    },
  ];
}
