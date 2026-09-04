import type { RouterOutputs } from "~/trpc/react";

export type RecentFormHistoryRow = Pick<
  RouterOutputs["games"]["listMyMatchHistory"][number],
  "outcome" | "scoredSets"
>;

export type RecentFormBar = {
  outcome: RecentFormHistoryRow["outcome"];
  label: "W" | "L" | "D";
  fillRatio: number;
};

export type RecentFormStreak =
  | { kind: "won"; count: number; label: string }
  | { kind: "lost"; count: number; label: string }
  | { kind: "none"; label: "No streak" };

export type RecentFormView = {
  bars: RecentFormBar[];
  streak: RecentFormStreak;
  winRatePercent: number;
  trendPoints: number | null;
};

const WINDOW = 10;
const HEIGHT_CAP = 18;

const OUTCOME_LABEL: Record<RecentFormHistoryRow["outcome"], "W" | "L" | "D"> =
  {
    won: "W",
    lost: "L",
    draw: "D",
  };

function setDifferential(sets: RecentFormHistoryRow["scoredSets"]): number {
  let total = 0;
  for (const set of sets) {
    total += Math.abs(set.slot1GamesWon - set.slot2GamesWon);
  }
  return total;
}

function fillRatio(sets: RecentFormHistoryRow["scoredSets"]): number {
  return Math.min(1, Math.max(0, setDifferential(sets) / HEIGHT_CAP));
}

function winRatePercent(rows: readonly RecentFormHistoryRow[]): number {
  if (rows.length === 0) {
    return 0;
  }
  const wins = rows.filter((row) => row.outcome === "won").length;
  return Math.round((100 * wins) / rows.length);
}

function streakFromNewestFirst(
  rows: readonly RecentFormHistoryRow[],
): RecentFormStreak {
  const newest = rows[0];
  if (!newest || newest.outcome === "draw") {
    return { kind: "none", label: "No streak" };
  }

  let count = 0;
  for (const row of rows) {
    if (row.outcome !== newest.outcome) {
      break;
    }
    count += 1;
  }

  if (newest.outcome === "won") {
    return {
      kind: "won",
      count,
      label: count === 1 ? "1 Win" : `${count} Wins`,
    };
  }

  return {
    kind: "lost",
    count,
    label: count === 1 ? "1 Loss" : `${count} Losses`,
  };
}

export function deriveRecentForm(
  rows: readonly RecentFormHistoryRow[],
): RecentFormView | null {
  if (rows.length === 0) {
    return null;
  }

  const current = rows.slice(0, WINDOW);
  const previous = rows.slice(WINDOW, WINDOW * 2);
  const trendPoints =
    rows.length >= WINDOW * 2
      ? winRatePercent(current) - winRatePercent(previous)
      : null;

  return {
    bars: [...current].reverse().map((row) => ({
      outcome: row.outcome,
      label: OUTCOME_LABEL[row.outcome],
      fillRatio: fillRatio(row.scoredSets),
    })),
    streak: streakFromNewestFirst(current),
    winRatePercent: winRatePercent(current),
    trendPoints,
  };
}
