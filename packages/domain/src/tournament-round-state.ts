import { MATCH_STATUS } from "./match-status";

/** An entered tournament score stands on its own once this long passes unanswered. */
export const SCORE_STANDS_AFTER_MINUTES = 10;

export type TournamentMatchState =
  | "scheduled"
  | "on_court"
  | "awaiting_confirmation"
  | "confirmed"
  | "not_finished"
  | "cancelled";

export function tournamentMatchState(args: {
  status: string | null;
  notFinishedAt: Date | string | null;
  hasResult: boolean;
  startTime: Date | string | null;
  now: Date;
}): TournamentMatchState {
  if (args.status === MATCH_STATUS.CANCELLED) {
    return "cancelled";
  }
  if (args.status === MATCH_STATUS.COMPLETED) {
    return "confirmed";
  }
  if (args.notFinishedAt) {
    return "not_finished";
  }
  if (args.hasResult) {
    return "awaiting_confirmation";
  }
  if (!args.startTime || new Date(args.startTime) <= args.now) {
    return "on_court";
  }
  return "scheduled";
}

export function isSettledTournamentMatch(state: TournamentMatchState) {
  return (
    state === "confirmed" || state === "cancelled" || state === "not_finished"
  );
}

export function scoreStandsAt(enteredAt: Date | string): Date {
  return new Date(
    new Date(enteredAt).getTime() + SCORE_STANDS_AFTER_MINUTES * 60 * 1000,
  );
}

export type TournamentRoundState =
  | "not_made"
  | "draft"
  | "scheduled"
  | "on_court"
  | "played";

export function tournamentRoundState(args: {
  draftCount: number;
  matchStates: readonly TournamentMatchState[];
}): TournamentRoundState {
  if (args.matchStates.length === 0) {
    return args.draftCount > 0 ? "draft" : "not_made";
  }
  if (args.matchStates.every(isSettledTournamentMatch)) {
    return "played";
  }
  if (args.matchStates.every((state) => state === "scheduled")) {
    return "scheduled";
  }
  return "on_court";
}

/**
 * The Round shown as current: the first posted Round not yet played, else
 * the last played one.
 */
export function currentRoundNumber(
  rounds: readonly { roundNumber: number; state: TournamentRoundState }[],
): number | null {
  const posted = rounds.filter(
    (round) => round.state !== "not_made" && round.state !== "draft",
  );
  const live = posted.find((round) => round.state !== "played");
  return live?.roundNumber ?? posted[posted.length - 1]?.roundNumber ?? null;
}

export type TournamentScoreOutcome = "slot1" | "slot2" | "draw";

export function tournamentScoreOutcome(
  slot1GamesWon: number,
  slot2GamesWon: number,
): TournamentScoreOutcome {
  if (slot1GamesWon === slot2GamesWon) {
    return "draw";
  }
  return slot1GamesWon > slot2GamesWon ? "slot1" : "slot2";
}

export const POOL_POINTS = { win: 3, draw: 1, loss: 0 } as const;

export function poolPoints(record: { won: number; drawn: number }) {
  return record.won * POOL_POINTS.win + record.drawn * POOL_POINTS.draw;
}

export function pointsForOutcome(
  outcome: TournamentScoreOutcome,
  slot: 1 | 2,
): number {
  if (outcome === "draw") {
    return POOL_POINTS.draw;
  }
  const won = outcome === (slot === 1 ? "slot1" : "slot2");
  return won ? POOL_POINTS.win : POOL_POINTS.loss;
}

/**
 * Every Pool Round has its Matches posted. Until then the Pool stage cannot
 * be finished, even when every posted Match is settled.
 */
export function allPoolRoundsPosted(
  matches: readonly {
    roundNumber: number | null;
    knockoutRound: number | null;
  }[],
  roundCount: number | null,
): boolean {
  if (roundCount == null) {
    return true;
  }
  const posted = new Set(
    matches
      .filter((match) => match.knockoutRound == null)
      .map((match) => match.roundNumber),
  );
  for (let roundNumber = 1; roundNumber <= roundCount; roundNumber += 1) {
    if (!posted.has(roundNumber)) {
      return false;
    }
  }
  return true;
}
