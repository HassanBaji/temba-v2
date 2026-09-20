import { formatGameCardDay } from "~/lib/format-game-start";
import { showsFriendlyRoster } from "~/lib/game-summary-cta";
import { isPoolTournament } from "~/lib/tournament-rounds";
import type { TournamentSizing } from "~/lib/tournament-sizing";

export type GameDetailsChrome = "friendly_game" | "pool_tournament" | "tabs";

export const TOURNAMENT_EYEBROW_PREFIX = "Friendly tournament";
export const YOUR_TEAM_LABEL = "Your team";
export const LEFT_SEAT_LABEL = "Left seat";
export const RIGHT_SEAT_LABEL = "Right seat";
export const OPEN_POSITION_SR_LABEL = "Open Position";
export const TOURNAMENT_YOU_ARE_IN_COPY = "You are in.";
export const TOURNAMENT_DRAW_RANDOM_CLAUSE = "and it is random.";
export const TOURNAMENT_DRAW_WHEN_FULL_COPY =
  "The draw happens once they are full";
export const TOURNAMENT_DRAWS_POOLS_WHEN_FULL_COPY =
  "draws the Pools once they are full";
export const TOURNAMENT_CLOSING_LINE =
  "Every Round is an ordinary Match. Scores are entered the usual way and the other team confirms.";
export const ORGANIZER_ROW_LABEL = "Organizer";
export const GROUP_ROW_LABEL = "Group";
export const PRICE_ROW_LABEL = "Price";
export const COUNTS_FOR_RATING_LABEL = "Counts for rating";
export const COUNTS_FOR_RATING_YES = "Yes";
export const YOU_OWE_ROW_LABEL = "You owe";
export const YOU_OWE_AFTER_EACH_MATCH = "after each Match";
export const INVITE_ACTION_LABEL = "Invite";
export const INVITE_FROM_A_GROUP_LABEL = "Invite from a group";
export const PRICE_PER_MATCH_SUFFIX = "per Match";
export const TEAMS_HEADING = "Teams";
export const TAKE_SEAT_LABEL = "Take seat";
export const YOUR_TEAM_TAG = "your team";
export const SEATS_HEADING = "Seats";
export const LEAVE_THE_SEAT_LABEL = "Leave the seat";
export const YOUR_ROUNDS_PREDRAW_CAPTION = "Opponents after the draw";
export const NOT_DRAWN_TRAILER = "Not drawn";

const TEAM_LIST_LEADING_FULL = 4;
const TEAM_LIST_MIN_COLLAPSE = 3;

export type TournamentHomeOccupant = {
  userId: string;
  name: string;
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
};

/**
 * One chrome per Game. Friendly-game roster and Pool tournament never overlap
 * (`showsFriendlyRoster` is `friendly_game`-only; Pool chrome is
 * `friendly_tournament` with a Pool count), so this is exclusive by
 * construction rather than by branch order on the page.
 */
export function gameDetailsChrome(
  format: string,
  poolCount: number | null | undefined,
  registrationMode: string,
): GameDetailsChrome {
  const usesFriendlyChrome = showsFriendlyRoster(format, registrationMode);
  const usesPoolTournamentChrome = isPoolTournament(format, poolCount);
  if (usesFriendlyChrome && usesPoolTournamentChrome) {
    return "friendly_game";
  }
  if (usesFriendlyChrome) {
    return "friendly_game";
  }
  if (usesPoolTournamentChrome) {
    return "pool_tournament";
  }
  return "tabs";
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
): TournamentTeamRowsView {
  const rows: TournamentTeamRow[] = sides.map((side, index) => {
    const isViewer =
      side.left?.userId === viewerUserId || side.right?.userId === viewerUserId;
    const openPosition = firstOpenPosition(side);
    const isHalfOpen = (side.left == null) !== (side.right == null);
    return {
      sideIndex: side.sideIndex,
      indexLabel: String(index + 1).padStart(2, "0"),
      name: teamRowName(side.left, side.right),
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

export function tournamentTeamsCountLine(full: number, open: number): string {
  const fullPart = `${full} full`;
  if (open <= 0) {
    return fullPart;
  }
  const openPart =
    open === 1 ? "1 with a Position open" : `${open} with a Position open`;
  return `${fullPart}, ${openPart}`;
}

export function tournamentCollapsedTeamsLabel(count: number): string {
  const amount = collapseCountWord(count);
  const teamWord = count === 1 ? "full team" : "full teams";
  return `${amount} more ${teamWord}`;
}

export function tournamentSeatsTakenLine(
  seatsTaken: number,
  seatTotal: number,
): string {
  return `${seatsTaken} of ${seatTotal}`;
}

export function tournamentSeatsTakenSrLabel(
  seatsTaken: number,
  seatTotal: number,
): string {
  return `${seatsTaken} of ${seatTotal} seats taken`;
}

export function tournamentOpenPositionSubline(
  position: "left" | "right",
): string {
  return `${positionSeatLabel(position)} open`;
}

export function tournamentSizeLine(sizing: TournamentSizing): string {
  const teamWord = sizing.teamCount === 1 ? "Game team" : "Game teams";
  return `${sizing.teamCount} ${teamWord}, ${poolSizeClause(sizing)}`;
}

export function tournamentStatusLine(input: TournamentStatusLineInput): string {
  if (input.seated) {
    if (input.seatsLeft === 0) {
      return `${TOURNAMENT_YOU_ARE_IN_COPY} The Pool draw is random.`;
    }
    const teamWord = input.teamCount === 1 ? "Game team" : "Game teams";
    return `${TOURNAMENT_YOU_ARE_IN_COPY} The draw happens once ${input.teamCount} ${teamWord} are full, ${TOURNAMENT_DRAW_RANDOM_CLAUSE}`;
  }

  const seats = seatsLeftSentence(input.seatsLeft);
  const drawer = drawWhenFullClause(input.organizerName);
  return `${seats} ${drawer}, ${TOURNAMENT_DRAW_RANDOM_CLAUSE}`;
}

export function tournamentEyebrow(roundCount: number): string {
  const rounds = roundCount === 1 ? "1 Round" : `${roundCount} Rounds`;
  return `${TOURNAMENT_EYEBROW_PREFIX}, ${rounds}`;
}

export function tournamentStartLine(
  windowStart: Date | string | null | undefined,
  venueName: string | null | undefined,
): string | null {
  if (!windowStart) {
    return null;
  }
  const day = formatGameCardDay(windowStart);
  const venue = venueName?.trim();
  if (venue) {
    return `Starts ${day}, ${venue}`;
  }
  return `Starts ${day}`;
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

export function positionSeatLabel(position: "left" | "right"): string {
  return position === "left" ? LEFT_SEAT_LABEL : RIGHT_SEAT_LABEL;
}

function teamRowName(
  left: TournamentHomeOccupant | null,
  right: TournamentHomeOccupant | null,
): string {
  const names = [left?.name, right?.name].filter((name): name is string =>
    Boolean(name?.trim()),
  );
  if (names.length === 0) {
    return "Open";
  }
  return names.join(" & ");
}

function poolSizeClause(sizing: TournamentSizing): string {
  const counts = new Map<number, number>();
  for (const size of sizing.poolSizes) {
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([size, count]) => {
      const poolWord = count === 1 ? "Pool" : "Pools";
      return `${count} ${poolWord} of ${size}`;
    })
    .join(", ");
}

function seatsLeftSentence(seatsLeft: number): string {
  if (seatsLeft <= 0) {
    return "No seats left.";
  }
  if (seatsLeft === 1) {
    return "1 seat left.";
  }
  return `${seatsLeft} seats left.`;
}

function drawWhenFullClause(organizerName: string | null): string {
  const first = firstName(organizerName);
  if (first) {
    return `${first} ${TOURNAMENT_DRAWS_POOLS_WHEN_FULL_COPY}`;
  }
  return TOURNAMENT_DRAW_WHEN_FULL_COPY;
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

const COLLAPSE_COUNT_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
] as const;

function collapseCountWord(count: number): string {
  return COLLAPSE_COUNT_WORDS[count] ?? String(count);
}
