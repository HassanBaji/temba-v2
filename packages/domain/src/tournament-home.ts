import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { formatGameCardDay } from "./format-game-start";
import { showsFriendlyRoster } from "./game-summary-cta";
import type { LevelBand } from "./level-bands";
import {
  buildKnockoutTree,
  knockoutRoundName,
  knockoutStartWord,
} from "./tournament-knockout";
import {
  knockoutCurrentRound,
  knockoutNowLine,
  type KnockoutViewRound,
} from "./tournament-knockout-view";
import {
  isDrawnTournament,
  plannedTournamentRoundCount,
  postedRoundCount,
} from "./tournament-rounds";
import { type TournamentSizing } from "./tournament-sizing";

export type GameDetailsChrome = "friendly_game" | "drawn_tournament" | "tabs";

const TEAM_LIST_LEADING_FULL = 4;
const TEAM_LIST_MIN_COLLAPSE = 3;

export type TournamentHomeOccupant = {
  userId: string;
  name: string;
  image?: string | null;
  levelBand?: LevelBand | null;
};

export type TournamentHomeSide = {
  sideIndex: number;
  left: TournamentHomeOccupant | null;
  right: TournamentHomeOccupant | null;
};

export type TournamentFieldSummary = {
  full: number;
  halfOpen: number;
  seatsTaken: number;
  seatTotal: number;
};

export type TournamentTeamRow = {
  sideIndex: number;
  indexLabel: string;
  name: string;
  isViewer: boolean;
  hasOpenPosition: boolean;
  openPosition: "left" | "right" | null;
  isHalfOpen: boolean;
};

export type TournamentTeamRowsView = {
  head: TournamentTeamRow[];
  collapsedCount: number;
  collapsed: TournamentTeamRow[];
  tail: TournamentTeamRow[];
};

export type TournamentStatusLineInput = {
  seated: boolean;
  seatsLeft: number;
  teamCount: number;
  organizerName: string | null;
  locale: Locale;
  knockoutOnly?: boolean;
  /** Groups then knockout: the line says the groups lead to a knockout. */
  thenKnockout?: boolean;
};

/**
 * One chrome per Game. Friendly-game roster and drawn tournament never overlap
 * (`showsFriendlyRoster` is `friendly_game`-only; drawn tournament chrome is
 * `friendly_tournament` with a Pool count or a Tournament shape), so this is
 * exclusive by construction rather than by branch order on the page.
 */
export function gameDetailsChrome(
  format: string,
  poolCount: number | null | undefined,
  tournamentShape: string | null | undefined,
  registrationMode: string,
): GameDetailsChrome {
  const usesFriendlyChrome = showsFriendlyRoster(format, registrationMode);
  const usesDrawnTournamentChrome = isDrawnTournament(
    format,
    poolCount,
    tournamentShape,
  );
  if (usesFriendlyChrome && usesDrawnTournamentChrome) {
    return "friendly_game";
  }
  if (usesFriendlyChrome) {
    return "friendly_game";
  }
  if (usesDrawnTournamentChrome) {
    return "drawn_tournament";
  }
  return "tabs";
}

export type TournamentHomeJoinKind = "join" | "register_team";

/** Complete Teams register a Team. Individual Join needs the mounted seat sheet. */
export function tournamentHomeJoinKind(
  registrationMode: string,
  canRegister: boolean,
): TournamentHomeJoinKind | null {
  if (!canRegister) {
    return null;
  }
  if (registrationMode === "team_only") {
    return "register_team";
  }
  if (registrationMode === "individual") {
    return "join";
  }
  return null;
}

export function tournamentFieldSummary(
  sides: readonly { left: unknown; right: unknown }[],
): TournamentFieldSummary {
  let full = 0;
  let halfOpen = 0;
  let seatsTaken = 0;
  for (const side of sides) {
    const taken = (side.left ? 1 : 0) + (side.right ? 1 : 0);
    seatsTaken += taken;
    if (taken === 2) {
      full += 1;
    } else if (taken === 1) {
      halfOpen += 1;
    }
  }
  return {
    full,
    halfOpen,
    seatsTaken,
    seatTotal: sides.length * 2,
  };
}

export function tournamentTeamRows(
  sides: readonly TournamentHomeSide[],
  viewerUserId: string,
  locale: Locale,
): TournamentTeamRowsView {
  const rows: TournamentTeamRow[] = sides.map((side, index) => {
    const isViewer =
      side.left?.userId === viewerUserId || side.right?.userId === viewerUserId;
    const openPosition = firstOpenPosition(side);
    const isHalfOpen = (side.left == null) !== (side.right == null);
    return {
      sideIndex: side.sideIndex,
      indexLabel: String(index + 1).padStart(2, "0"),
      name: teamRowName(side.left, side.right, locale),
      isViewer,
      hasOpenPosition: openPosition != null,
      openPosition,
      isHalfOpen,
    };
  });

  const collapsible = rows.map((row) => !row.isViewer && !row.hasOpenPosition);
  const viewerIndex = rows.findIndex((row) => row.isViewer);

  let suffixStart = rows.length;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (collapsible[index]) {
      break;
    }
    suffixStart = index;
  }

  let headEnd = 0;
  let leadingFull = 0;
  while (headEnd < suffixStart) {
    if (!collapsible[headEnd]) {
      headEnd += 1;
      continue;
    }
    if (leadingFull < TEAM_LIST_LEADING_FULL) {
      leadingFull += 1;
      headEnd += 1;
      continue;
    }
    break;
  }

  if (viewerIndex >= 0) {
    headEnd = Math.max(headEnd, viewerIndex + 1);
  }

  const collapsedCount = suffixStart - headEnd;
  if (collapsedCount < TEAM_LIST_MIN_COLLAPSE) {
    return { head: rows, collapsedCount: 0, collapsed: [], tail: [] };
  }

  return {
    head: rows.slice(0, headEnd),
    collapsedCount,
    collapsed: rows.slice(headEnd, suffixStart),
    tail: rows.slice(suffixStart),
  };
}

export function tournamentTeamsCountLine(
  full: number,
  open: number,
  locale: Locale,
): string {
  const m = messagesFor(locale).tournament.home;
  if (full <= 0 && open <= 0) {
    return "";
  }
  if (full <= 0) {
    return m.withPositionOpen(open);
  }
  if (open <= 0) {
    return m.fullCount(full);
  }
  return m.fullAndOpen(full, open);
}

export function tournamentCollapsedTeamsLabel(
  count: number,
  locale: Locale,
): string {
  return messagesFor(locale).tournament.home.moreFullTeams(count);
}

export function tournamentSeatsTakenLine(
  seatsTaken: number,
  seatTotal: number,
  locale: Locale,
): string {
  return messagesFor(locale).tournament.home.seatsTaken(seatsTaken, seatTotal);
}

export function tournamentSeatsTakenSrLabel(
  seatsTaken: number,
  seatTotal: number,
  locale: Locale,
): string {
  return messagesFor(locale).tournament.home.seatsTakenSr(
    seatsTaken,
    seatTotal,
  );
}

export function tournamentOpenPositionSubline(
  position: "left" | "right",
  locale: Locale,
): string {
  const m = messagesFor(locale).tournament.home;
  return position === "left" ? m.leftSeatOpen : m.rightSeatOpen;
}

/** `12 Game teams, 3 groups of 4`, then `, then quarters` with a Knockout. */
export function tournamentSizeLine(
  sizing: TournamentSizing,
  locale: Locale,
  knockoutRoundCount?: number | null,
): string {
  const m = messagesFor(locale).tournament.home;
  const clause = poolSizeClause(sizing, locale);
  return knockoutRoundCount != null
    ? m.sizeLineThen(
        sizing.teamCount,
        clause,
        knockoutStartWord(knockoutRoundCount, locale),
      )
    : m.sizeLine(sizing.teamCount, clause);
}

/** `12 Game teams, knockout from the Round of 16` */
export function knockoutSizeLine(
  teamCount: number,
  locale: Locale,
): string | null {
  const tree = buildKnockoutTree({ entrantCount: teamCount });
  if (!tree) {
    return null;
  }
  return messagesFor(locale).tournament.home.knockoutSizeLine(
    teamCount,
    knockoutRoundName(1, tree.roundCount, locale),
  );
}

export function tournamentStatusLine(input: TournamentStatusLineInput): string {
  const line = drawStatusLine(input);
  return input.thenKnockout && !input.knockoutOnly
    ? `${line} ${messagesFor(input.locale).tournament.home.groupsThenKnockoutLead}`
    : line;
}

function drawStatusLine(input: TournamentStatusLineInput): string {
  const m = messagesFor(input.locale).tournament.home;
  if (input.seated) {
    if (input.seatsLeft === 0) {
      return input.knockoutOnly
        ? m.youAreInDrawRandom
        : m.youAreInGroupDrawRandom;
    }
    return m.youAreInDrawWhenFull(input.teamCount);
  }
  return m.unseatedStatus(
    input.seatsLeft,
    firstName(input.organizerName),
    input.knockoutOnly === true,
  );
}

export function tournamentRoundCount(game: {
  format: string;
  teamsAllowed: number | null | undefined;
  poolCount: number | null | undefined;
  tournamentShape: string | null | undefined;
  roundCount: number | null | undefined;
  drawPostedAt: Date | string | null | undefined;
  matches: readonly {
    roundNumber: number | null;
    knockoutRound: number | null;
  }[];
}): number | null {
  if (isTournamentStandingsView(game.drawPostedAt)) {
    return postedRoundCount(game.matches);
  }
  return plannedTournamentRoundCount(game);
}

export function tournamentEyebrow(
  roundCount: number,
  locale: Locale,
  knockoutOnly = false,
): string {
  const m = messagesFor(locale).tournament.home;
  if (knockoutOnly) {
    return m.eyebrowKnockout;
  }
  return m.eyebrowRounds(roundCount);
}

/**
 * Standings header after the draw: the Knockout round now being played once
 * a Game team is in it, else the Pool Rounds played.
 */
export function drawnTournamentProgressLine(args: {
  roundsPlayed: string | null;
  knockout: readonly KnockoutViewRound[] | null;
  locale: Locale;
}): string | null {
  const current = knockoutCurrentRound(args.knockout);
  return current
    ? knockoutNowLine(current.name, args.locale)
    : args.roundsPlayed;
}

export function tournamentStartLine(
  windowStart: Date | string | null | undefined,
  venueName: string | null | undefined,
  locale: Locale,
): string | null {
  if (!windowStart) {
    return null;
  }
  const m = messagesFor(locale).tournament.home;
  const day = formatGameCardDay(windowStart, locale);
  const venue = venueName?.trim();
  if (venue) {
    return m.startsAt(day, venue);
  }
  return m.starts(day);
}

export function tournamentOrganizerName(args: {
  createdBy: string;
  people: readonly { userId: string; name: string }[];
}): string | null {
  const match = args.people.find((person) => person.userId === args.createdBy);
  const name = match?.name.trim();
  return name && name.length > 0 ? name : null;
}

export function tournamentViewerSide<T extends TournamentHomeSide>(
  sides: readonly T[],
  viewerUserId: string,
): T | null {
  return (
    sides.find(
      (side) =>
        side.left?.userId === viewerUserId ||
        side.right?.userId === viewerUserId,
    ) ?? null
  );
}

export function isTournamentStandingsView(
  drawPostedAt: Date | string | null | undefined,
) {
  return drawPostedAt != null;
}

export function defaultStandingsPoolIndex(
  viewerPoolIndex: number | null | undefined,
  pools: readonly { poolIndex: number }[],
): number | null {
  if (
    viewerPoolIndex != null &&
    pools.some((pool) => pool.poolIndex === viewerPoolIndex)
  ) {
    return viewerPoolIndex;
  }
  return pools[0]?.poolIndex ?? null;
}

export type OtherPoolsPlayedMatch = {
  status: string | null | undefined;
};

export type OtherPoolsPlayedPool = {
  poolIndex: number;
  label: string;
  matches: readonly OtherPoolsPlayedMatch[];
};

export type OtherPoolsPlayedSummary = {
  namesLine: string;
  playedLabel: string;
  nextPoolIndex: number;
};

export function otherPoolsPlayedSummary(
  selectedPoolIndex: number,
  pools: readonly OtherPoolsPlayedPool[],
  locale: Locale,
): OtherPoolsPlayedSummary | null {
  const others = pools.filter((pool) => pool.poolIndex !== selectedPoolIndex);
  if (others.length === 0) {
    return null;
  }

  const after = others.filter((pool) => pool.poolIndex > selectedPoolIndex);
  const next = after[0] ?? others[0];
  if (!next) {
    return null;
  }

  let played = 0;
  for (const pool of others) {
    for (const match of pool.matches) {
      if (match.status === "completed") {
        played += 1;
      }
    }
  }

  return {
    namesLine: joinPoolLabels(
      others.map((pool) => pool.label),
      locale,
    ),
    playedLabel: otherPoolsPlayedLabel(played, locale),
    nextPoolIndex: next.poolIndex,
  };
}

export function otherPoolsPlayedLabel(count: number, locale: Locale): string {
  return messagesFor(locale).tournament.home.matchesPlayed(count);
}

export function roundResultsHeading(
  roundNumber: number,
  locale: Locale,
): string {
  const m = messagesFor(locale).tournament.home;
  if (roundNumber <= 0) {
    return m.roundResults;
  }
  return m.roundNResults(roundNumber);
}

function joinPoolLabels(labels: readonly string[], locale: Locale): string {
  const m = messagesFor(locale).tournament;
  if (labels.length === 0) {
    return "";
  }
  if (labels.length === 1) {
    return labels[0] ?? "";
  }
  const leading = labels.slice(0, -1).join(m.listSeparator);
  return m.listAnd(leading, labels[labels.length - 1] ?? "");
}

export function positionSeatLabel(
  position: "left" | "right",
  locale: Locale,
): string {
  const m = messagesFor(locale).tournament.home;
  return position === "left" ? m.leftSeat : m.rightSeat;
}

function teamRowName(
  left: TournamentHomeOccupant | null,
  right: TournamentHomeOccupant | null,
  locale: Locale,
): string {
  const names = [left?.name, right?.name].filter((name): name is string =>
    Boolean(name?.trim()),
  );
  if (names.length === 0) {
    return messagesFor(locale).tournament.home.openTeamRow;
  }
  return names.join(" & ");
}

function poolSizeClause(sizing: TournamentSizing, locale: Locale): string {
  const m = messagesFor(locale).tournament;
  const counts = new Map<number, number>();
  for (const size of sizing.poolSizes) {
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([size, count]) => m.sizing.poolSizeClause(count, size))
    .join(m.listSeparator);
}

function firstName(name: string | null): string | null {
  const token = name?.trim().split(/\s+/)[0];
  return token && token.length > 0 ? token : null;
}

function firstOpenPosition(side: TournamentHomeSide): "left" | "right" | null {
  if (side.left == null) {
    return "left";
  }
  if (side.right == null) {
    return "right";
  }
  return null;
}
