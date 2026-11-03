import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { MatchOutcome } from "./result-mark";
import { winRatePercent } from "./win-rate";

export type RecentFormHistoryRow = {
  outcome: MatchOutcome;
  scoredSets?: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

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
  | { kind: "none"; label: string };

export type RecentFormView = {
  wins: number;
  losses: number;
  draws: number;
  bars: RecentFormBar[];
  streak: RecentFormStreak;
  winRatePercent: number;
  playedCount: number;
};

export const RECENT_FORM_MATCH_COUNT = 10;
const WINDOW = RECENT_FORM_MATCH_COUNT;

const OUTCOME_LABEL: Record<RecentFormHistoryRow["outcome"], "W" | "L" | "D"> =
  {
    won: "W",
    lost: "L",
    draw: "D",
  };

export function streakFromNewestFirst(
  rows: readonly RecentFormHistoryRow[],
  locale: Locale,
): RecentFormStreak {
  const m = messagesFor(locale).home.recentForm;
  const newest = rows[0];
  if (!newest || newest.outcome === "draw") {
    return { kind: "none", label: m.noStreak };
  }

  let count = 0;
  for (const row of rows) {
    if (row.outcome !== newest.outcome) {
      break;
    }
    count += 1;
  }

  if (newest.outcome === "won") {
    return { kind: "won", count, label: m.winStreak(count) };
  }

  return { kind: "lost", count, label: m.loseStreak(count) };
}

export function deriveRecentForm(
  rows: readonly RecentFormHistoryRow[],
  locale: Locale,
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
    streak: streakFromNewestFirst(current, locale),
    winRatePercent:
      winRatePercent(
        current.filter((row) => row.outcome === "won").length,
        current.length,
      ) ?? 0,
    playedCount: current.length,
  };
}

export function recentFormRecord(form: RecentFormView): string {
  if (form.draws > 0) {
    return `${form.wins}–${form.losses}–${form.draws}`;
  }
  return `${form.wins}–${form.losses}`;
}

export function recentFormStatus(form: RecentFormView, locale: Locale): string {
  const unfilled = WINDOW - form.playedCount;
  if (unfilled > 0) {
    return messagesFor(locale).home.recentForm.slotsLeft(unfilled);
  }
  return form.streak.label;
}

export function recentFormWinRateCopy(
  form: RecentFormView,
  locale: Locale,
): {
  value: string;
  caption: string;
} {
  const m = messagesFor(locale).home.recentForm;
  if (form.playedCount < 3) {
    return { value: "—", caption: m.winRateAfterThree };
  }
  return { value: `${form.winRatePercent}%`, caption: m.winRate };
}
