import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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
  | "played"
  | "cancelled";

export function tournamentRoundState(args: {
  draftCount: number;
  matchStates: readonly TournamentMatchState[];
}): TournamentRoundState {
  if (args.matchStates.length === 0) {
    return args.draftCount > 0 ? "draft" : "not_made";
  }
  if (args.matchStates.every((state) => state === "cancelled")) {
    return "cancelled";
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
 * the last played one. A cancelled Round is never current while another
 * posted Round stands.
 */
export function currentRoundNumber(
  rounds: readonly { roundNumber: number; state: TournamentRoundState }[],
): number | null {
  const posted = rounds.filter(
    (round) => round.state !== "not_made" && round.state !== "draft",
  );
  const standing = posted.filter((round) => round.state !== "cancelled");
  const live = standing.find((round) => round.state !== "played");
  return (
    live?.roundNumber ??
    standing[standing.length - 1]?.roundNumber ??
    posted[posted.length - 1]?.roundNumber ??
    null
  );
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

export function tournamentRoundStateLabel(
  state: TournamentRoundState,
  locale: Locale,
) {
  const m = messagesFor(locale).tournamentRounds;
  switch (state) {
    case "not_made":
      return m.manage.notMade;
    case "draft":
      return m.round.draft;
    case "scheduled":
      return m.round.posted;
    case "on_court":
      return m.round.onCourt;
    case "played":
      return m.round.played;
    case "cancelled":
      return m.round.cancelled;
  }
}

/**
 * What the Organizer is told before cancelling a Round: whether it comes off
 * the schedule or stays as cancelled, and how many scores go with it.
 */
export function roundCancelCopy(
  round: {
    roundNumber: number;
    cancelEffect: "remove" | "void" | null;
    matches: readonly { state: TournamentMatchState | "draft" }[];
  },
  roundCount: number,
  locale: Locale,
) {
  const m = messagesFor(locale).tournamentRounds.manage;
  if (round.cancelEffect === "remove") {
    return m.cancelRemove(round.roundNumber, roundCount - 1);
  }
  const scores = round.matches.filter(
    (match) =>
      match.state === "confirmed" || match.state === "awaiting_confirmation",
  ).length;
  return scores > 0
    ? m.cancelVoidScored(round.roundNumber, scores)
    : m.cancelVoid(round.roundNumber);
}
