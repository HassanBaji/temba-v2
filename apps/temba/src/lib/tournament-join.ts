import { formatGameCardDay } from "~/lib/format-game-start";
import type { FriendlyGameJoinSeat } from "~/lib/friendly-game-cta";
import { firstFullyVacantSideIndex } from "~/lib/friendly-game-partner";
import { isPreferredPosition } from "~/lib/preferred-position";
import { remainingJoinSeatOnSide, defaultJoinSeat } from "~/lib/preferred-seat";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
  PRICE_ROW_LABEL,
  tournamentSeatsTakenSrLabel,
} from "~/lib/tournament-home";
import { isPoolTournament } from "~/lib/tournament-rounds";
import { sizeFriendlyTournament } from "~/lib/tournament-sizing";

export const TAKE_A_SEAT_TITLE = "Take a seat";
export const SIT_WITH_SOMEONE_HEADING = "Sit with someone";
export const START_A_TEAM_ON_YOUR_OWN_LABEL = "Start a team on your own";
export const START_A_TEAM_ON_YOUR_OWN_SUBLINE =
  "Someone takes the other Position, or the Organizer pairs you";
export const YOUR_SEAT_HEADING = "Your seat";
export const TAKEN_SEAT_LABEL = "taken";
export const ROUNDS_ROW_LABEL = "Rounds";
export const DRAW_ROW_LABEL = "Draw";
export const DRAW_RANDOM_VALUE = "Random";
export const PRICE_PER_PLAYER_JOIN_SUFFIX = "per player";
export const JOIN_SHEET_INTRO_SUFFIX =
  "Same as joining a game, you just pick who you play with.";
export const LEAVE_SEAT_UNTIL_POOL_DRAW_COPY =
  "You can leave the seat up until the Pool draw.";

export type TournamentJoinSide = {
  sideIndex: number;
  left: unknown;
  right: unknown;
};

export type TournamentJoinSeatAvailability = {
  leftTaken: boolean;
  rightTaken: boolean;
};

/**
 * The Take-a-seat sheet is the Pool tournament branch of the shared join
 * drawer. Individual Friendly games stay on two sides; a side-count fallback
 * keeps the existing tournament list when `poolCount` is not passed in.
 */
export function isTournamentJoinSheet(
  format: string | undefined,
  poolCount: number | null | undefined,
  sideCount: number,
) {
  return isPoolTournament(format ?? "", poolCount) || sideCount > 2;
}

export function tournamentJoinRoundCount(
  teamsAllowed: number | null | undefined,
  poolCount: number | null | undefined,
): number | null {
  if (teamsAllowed == null || poolCount == null) {
    return null;
  }
  const sized = sizeFriendlyTournament(teamsAllowed, poolCount);
  return sized.ok ? sized.sizing.roundCount : null;
}

export function tournamentJoinHeaderLine(args: {
  name: string;
  roundCount: number | null;
  firstRoundDay: string | null;
}): string {
  const name = args.name.trim();
  const rounds = roundCountLabel(args.roundCount);
  let lead = name;
  if (name && rounds && args.firstRoundDay) {
    lead = `${name}, ${rounds} from ${args.firstRoundDay}`;
  } else if (name && rounds) {
    lead = `${name}, ${rounds}`;
  } else if (!name && rounds && args.firstRoundDay) {
    lead = `${rounds} from ${args.firstRoundDay}`;
  } else if (!name && rounds) {
    lead = rounds;
  }
  if (!lead) {
    return JOIN_SHEET_INTRO_SUFFIX;
  }
  return `${lead}. ${JOIN_SHEET_INTRO_SUFFIX}`;
}

export function tournamentJoinFirstRoundDay(
  start: Date | string | null | undefined,
): string | null {
  if (!start) {
    return null;
  }
  return formatGameCardDay(start);
}

export function tournamentSitWithCountLine(halfOpen: number): string {
  if (halfOpen <= 0) {
    return "";
  }
  if (halfOpen === 1) {
    return "1 Game team with a Position open";
  }
  return `${halfOpen} Game teams with a Position open`;
}

export function tournamentJoinOccupantSubline(args: {
  occupantPosition: "left" | "right";
  levelLabel: string | null;
  openPosition: "left" | "right";
}): string {
  const plays = args.occupantPosition === "left" ? "Plays left" : "Plays right";
  const open =
    args.openPosition === "left" ? "Left seat open" : "Right seat open";
  return [plays, args.levelLabel, open].filter(Boolean).join(", ");
}

export function tournamentJoinTakeSeatLabel(
  position: "left" | "right",
): string {
  return `Take the ${position === "left" ? "Left" : "Right"} seat`;
}

export function tournamentJoinSeatsTakenLine(
  seatsTaken: number,
  seatTotal: number,
): string {
  return tournamentSeatsTakenSrLabel(seatsTaken, seatTotal);
}

export function tournamentYourSeatAvailability(
  side:
    | {
        left: unknown;
        right: unknown;
      }
    | null
    | undefined,
): TournamentJoinSeatAvailability {
  if (!side) {
    return { leftTaken: true, rightTaken: true };
  }
  return {
    leftTaken: side.left != null,
    rightTaken: side.right != null,
  };
}

export function isFullyVacantJoinSide(side: { left: unknown; right: unknown }) {
  return side.left == null && side.right == null;
}

export function tournamentStartOwnSeat(
  sides: readonly TournamentJoinSide[],
  preferredPosition: string | null | undefined,
  current: FriendlyGameJoinSeat | null,
): FriendlyGameJoinSeat | null {
  const sideIndex = firstFullyVacantSideIndex(sides);
  if (sideIndex == null) {
    return null;
  }
  const preferred =
    isPreferredPosition(preferredPosition) && preferredPosition !== "either"
      ? preferredPosition
      : null;
  const position = preferred ?? current?.position ?? "left";
  return { sideIndex, position };
}

export function tournamentJoinResolvedSeat(
  sides: readonly TournamentJoinSide[],
  seat: FriendlyGameJoinSeat | null,
): FriendlyGameJoinSeat | null {
  if (!seat) {
    return null;
  }
  const side = sides.find((row) => row.sideIndex === seat.sideIndex);
  if (!side) {
    return null;
  }
  if (side[seat.position] == null) {
    return seat;
  }
  return remainingJoinSeatOnSide(side);
}

export function tournamentJoinOpeningSeat(
  sides: readonly TournamentJoinSide[],
  preferredPosition: string | null | undefined,
  initialSeat: FriendlyGameJoinSeat | null,
): FriendlyGameJoinSeat | null {
  const raw =
    initialSeat ??
    defaultJoinSeat(sides, preferredPosition) ??
    tournamentStartOwnSeat(sides, preferredPosition, null);
  return tournamentJoinResolvedSeat(sides, raw);
}

export function tournamentJoinSeatExplanation(args: {
  occupantName: string | null;
  occupiedPosition: "left" | "right" | null;
  freePosition: "left" | "right";
  roundCount: number | null;
}): string {
  const rounds = roundsForAllClause(args.roundCount);
  const occupant = firstName(args.occupantName);
  if (occupant && args.occupiedPosition) {
    return `${occupant} has the ${args.occupiedPosition} seat, so you take the ${args.freePosition}${rounds}.`;
  }
  return `Both Positions are open. You pick Left or Right${rounds}.`;
}

export function tournamentJoinDetailRows(args: {
  roundDates: readonly string[];
  roundCount: number | null;
  priceLabel: string | null;
}): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const roundsValue = tournamentJoinRoundsValue(
    args.roundDates,
    args.roundCount,
  );
  if (roundsValue) {
    rows.push({ label: ROUNDS_ROW_LABEL, value: roundsValue });
  }
  if (args.priceLabel) {
    rows.push({
      label: PRICE_ROW_LABEL,
      value:
        args.priceLabel === "Free"
          ? args.priceLabel
          : `${args.priceLabel} ${PRICE_PER_PLAYER_JOIN_SUFFIX}`,
    });
  }
  rows.push({
    label: COUNTS_FOR_RATING_LABEL,
    value: COUNTS_FOR_RATING_YES,
  });
  rows.push({
    label: DRAW_ROW_LABEL,
    value: DRAW_RANDOM_VALUE,
  });
  return rows;
}

export function tournamentJoinRoundsValue(
  roundDates: readonly string[],
  roundCount: number | null,
): string | null {
  if (roundDates.length > 0) {
    return roundDates.join(", ");
  }
  return roundCountLabel(roundCount);
}

function roundCountLabel(roundCount: number | null): string | null {
  if (roundCount == null) {
    return null;
  }
  return roundCount === 1 ? "1 Round" : `${roundCount} Rounds`;
}

function roundsForAllClause(roundCount: number | null): string {
  const label = roundCountLabel(roundCount);
  return label ? ` for all ${label}` : "";
}

function firstName(name: string | null): string | null {
  const token = name?.trim().split(/\s+/)[0];
  return token && token.length > 0 ? token : null;
}
