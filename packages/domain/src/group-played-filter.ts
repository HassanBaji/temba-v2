/**
 * The Group Games tab Played list filters (design "Group games 1d"): a past
 * Game is Finished once its Match carries a score, Needs score until then,
 * and Cancelled whatever its score. Cancelled Games appear only under
 * Cancelled and All.
 */

import type { MatchOutcome } from "./result-mark";

export const GROUP_PLAYED_FILTERS = [
  "finished",
  "needs_score",
  "cancelled",
  "all",
] as const;

export type GroupPlayedFilter = (typeof GROUP_PLAYED_FILTERS)[number];

export type GroupPlayedStatus = Exclude<GroupPlayedFilter, "all">;

export const DEFAULT_GROUP_PLAYED_FILTER: GroupPlayedFilter = "finished";

type PlayedGameState = {
  cancelled: boolean;
  scoredSets: readonly unknown[];
};

export function groupPlayedStatus(game: PlayedGameState): GroupPlayedStatus {
  if (game.cancelled) {
    return "cancelled";
  }
  return game.scoredSets.length > 0 ? "finished" : "needs_score";
}

export function groupPlayedMatchesFilter(
  game: PlayedGameState,
  filter: GroupPlayedFilter,
) {
  return filter === "all" || groupPlayedStatus(game) === filter;
}

export type GroupPlayedCounts = Record<GroupPlayedFilter, number> & {
  /** The viewer's record over the Finished Games they played. */
  record: { wins: number; draws: number; losses: number };
};

export function groupPlayedCounts(
  games: readonly (PlayedGameState & { outcome: MatchOutcome | null })[],
): GroupPlayedCounts {
  const counts: GroupPlayedCounts = {
    finished: 0,
    needs_score: 0,
    cancelled: 0,
    all: games.length,
    record: { wins: 0, draws: 0, losses: 0 },
  };
  for (const game of games) {
    const status = groupPlayedStatus(game);
    counts[status] += 1;
    if (status !== "finished") {
      continue;
    }
    if (game.outcome === "won") {
      counts.record.wins += 1;
    } else if (game.outcome === "draw") {
      counts.record.draws += 1;
    } else if (game.outcome === "lost") {
      counts.record.losses += 1;
    }
  }
  return counts;
}
