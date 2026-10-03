import type { RouterOutputs } from "~/trpc/react";

export type RecentFormHistoryRow = Pick<
  RouterOutputs["games"]["listMyMatchHistory"][number],
  "outcome" | "scoredSets"
>;

export type RecentFormBar =
  | {
      kind: "played";
      outcome: RecentFormHistoryRow["outcome"];
      label: "W" | "L" | "D";
    }
  | { kind: "empty" };

export type RecentFormStreak =
  | { kind: "won"; count: number; label: string }
  | { kind: "lost"; count: number; label: string }
  | { kind: "none"; label: "No streak" };

export type RecentFormView = {
  wins: number;
  losses: number;
  draws: number;
  bars: RecentFormBar[];
  streak: RecentFormStreak;
  winRatePercent: number;
  playedCount: number;
};

const WINDOW = 10;

const OUTCOME_LABEL: Record<RecentFormHistoryRow["outcome"], "W" | "L" | "D"> =
  {
    won: "W",
    lost: "L",
    draw: "D",
  };

function winRatePercent(rows: readonly RecentFormHistoryRow[]): number {
  if (rows.length === 0) {
    return 0;
  }
  const wins = rows.filter((row) => row.outcome === "won").length;
  return Math.round((100 * wins) / rows.length);
}

export function streakFromNewestFirst(
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
      label:
        count === 1
          ? "Building that win streak"
          : `On a ${count} games Win streak`,
    };
  }

  return {
    kind: "lost",
    count,
    label: count === 1 ? "Painful loss" : `On a ${count} games Lose streak`,
  };
}

export function deriveRecentForm(
  rows: readonly RecentFormHistoryRow[],
): RecentFormView {
  const current = rows.slice(0, WINDOW);
  const played: RecentFormBar[] = current.map((row) => ({
    kind: "played",
    outcome: row.outcome,
    label: OUTCOME_LABEL[row.outcome],
  }));
  const empty: RecentFormBar[] = Array.from(
    { length: WINDOW - played.length },
    () => ({ kind: "empty" }),
  );

  return {
    wins: current.filter((row) => row.outcome === "won").length,
    losses: current.filter((row) => row.outcome === "lost").length,
    draws: current.filter((row) => row.outcome === "draw").length,
    bars: [...played, ...empty],
    streak: streakFromNewestFirst(current),
    winRatePercent: winRatePercent(current),
    playedCount: current.length,
  };
}

export function recentFormRecord(form: RecentFormView): string {
  if (form.draws > 0) {
    return `${form.wins}–${form.losses}–${form.draws}`;
  }
  return `${form.wins}–${form.losses}`;
}

const SLOT_WORDS = [
  "",
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
] as const;

export function recentFormStatus(form: RecentFormView): string {
  const unfilled = WINDOW - form.playedCount;
  if (unfilled === 1) {
    return "One slot left to fill";
  }
  if (unfilled > 1) {
    const word = SLOT_WORDS[unfilled] ?? String(unfilled);
    return `${word} slots left to fill`;
  }
  return form.streak.label;
}

export function recentFormWinRateCopy(form: RecentFormView): {
  value: string;
  caption: string;
} {
  if (form.playedCount < 3) {
    return { value: "—", caption: "win rate after 3 games" };
  }
  return { value: `${form.winRatePercent}%`, caption: "win rate" };
}
