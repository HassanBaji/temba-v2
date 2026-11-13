import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth } from "./format-game-start";
import { sideSizeLabel } from "./game-shape";
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
  viewerIsCaptain?: boolean;
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
  const copy = m.challenge.gameDetails;
  const team = (side: ChallengeTeamSide | undefined) => {
    const name = opponentName(side?.name ?? null, locale);
    const record = side?.record ?? { wins: 0, draws: 0, losses: 0 };
    const recordValue = headToHeadLine(record, sport ?? "padel", locale);
    const spoken = recordSpoken(record, sport, locale);
    const captain = side?.viewerIsCaptain === true;
    return {
      name,
      initials: side?.initials ?? "",
      recordLabel: isFootball(sport)
        ? teamCopy.recordWithDraws
        : teamCopy.record,
      recordValue,
      recordLine: captain ? copy.recordYouCaptain(recordValue) : recordValue,
      recordSpoken: captain ? copy.recordYouCaptain(spoken) : spoken,
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
    title: copy.teamVsTeam(home.name, away.name),
    headToHeadLine: headToHeadLineText,
    middleLine: headToHead
      ? copy.headToHeadShort(
          headToHeadLine(headToHead, sport ?? "padel", locale),
        )
      : copy.firstMeetingShort,
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

/**
 * Both records and the named; padel also moves Levels, and so does a
 * football Challenge Game that counts for Temba Level, once each Team
 * confirms (ADR-0069). An older football one is Unrated.
 */
export function challengeCountsForLine(
  sport: string | null,
  rated: boolean,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.gameDetails.countsForLine;
  if (!isFootball(sport)) {
    return m.padel;
  }
  return rated ? m.footballLevel : m.football;
}

/** "Pitch 1, 6-a-side, 90 min. Confirmed by both teams" under a Challenge Game's day line. */
export function challengeHeroSubLine(
  input: {
    pitchName: string | null;
    sideSize: number | null;
    windowStart: Date | string | null;
    windowEnd: Date | string | null;
  },
  locale: Locale,
) {
  const m = messagesFor(locale);
  const minutes =
    input.windowStart && input.windowEnd
      ? Math.round(
          (new Date(input.windowEnd).getTime() -
            new Date(input.windowStart).getTime()) /
            60_000,
        )
      : 0;
  const line = [
    input.pitchName ? m.common.isolate(input.pitchName) : null,
    input.sideSize ? sideSizeLabel(input.sideSize, locale) : null,
    minutes > 0 ? m.dates.minutes(minutes) : null,
  ]
    .filter(Boolean)
    .join(m.common.listSeparator);
  const copy = m.challenge.gameDetails;
  return line ? copy.subLineConfirmed(line) : copy.confirmedByBoth;
}

export type ChallengeDetailsRow = {
  key: "from" | "proposed" | "place" | "cost" | "counts";
  label: string;
  value: string;
};

/**
 * The details rows of a Challenge Game, in the design's order. Temba records
 * no booking, so the place row says "Book it yourselves" rather than who
 * booked it.
 */
export function challengeGameDetailsRows(
  input: {
    sport: string | null;
    rated: boolean;
    postedByTeamName: string | null;
    postedAt: Date | string | null;
    proposedByTeamName: string | null;
    confirmedByName: string | null;
    confirmedByViewer: boolean;
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
  const postedBy = opponentName(input.postedByTeamName, locale);
  const place =
    input.venueName && input.courtName
      ? game.place(input.venueName, input.courtName)
      : (input.venueName ?? input.courtName ?? null);
  return [
    {
      key: "from",
      label: copy.fromChallenge,
      value: input.postedAt
        ? copy.postedByOn(postedBy, formatDayMonth(input.postedAt, locale))
        : copy.postedBy(postedBy),
    },
    {
      key: "proposed",
      label: copy.proposedBy,
      value: copy.proposedConfirmed(
        opponentName(input.proposedByTeamName, locale),
        input.confirmedByViewer
          ? copy.you
          : (input.confirmedByName ?? fallback),
      ),
    },
    {
      key: "place",
      label: isFootball(input.sport) ? game.pitch : game.court,
      value: place
        ? copy.placeBook(place, game.bookYourselves)
        : game.bookYourselves,
    },
    { key: "cost", label: game.cost, value: input.costLine },
    {
      key: "counts",
      label: copy.countsFor,
      value: challengeCountsForLine(input.sport, input.rated, locale),
    },
  ];
}
