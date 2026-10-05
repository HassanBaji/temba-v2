import {
  friendlyTournamentMatchCountLabel,
  knockoutMatchCountLabel,
  parseCreateMatchMinutes,
  validateFriendlyGameWhen,
} from "@repo/domain/create-game-flow";
import type { FriendlyTournamentPlan } from "@repo/domain/create-game-submit";
import { formatGameClock } from "@repo/domain/format-game-start";
import { formatTimeSlotLabel } from "@repo/domain/game-window";
import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import { courtCountValue, oneDayFit } from "@repo/domain/tournament-sizing";

export type LevelRangeSummary = {
  minimum: string;
  maximum: string;
  open: boolean;
};

const UNSET_BOUND = "Any";

export function levelRangeSummary(
  min: LevelBandSelectValue,
  max: LevelBandSelectValue,
): LevelRangeSummary {
  return {
    minimum: min === LEVEL_BAND_SELECT_NONE ? UNSET_BOUND : min,
    maximum: max === LEVEL_BAND_SELECT_NONE ? UNSET_BOUND : max,
    open: min === LEVEL_BAND_SELECT_NONE && max === LEVEL_BAND_SELECT_NONE,
  };
}

export type TournamentMatchTotals = {
  pool: number;
  knockout: number;
  total: number;
};

const sum = (counts: readonly number[]) =>
  counts.reduce((total, matches) => total + matches, 0);

function knockoutRoundMatches(plan: FriendlyTournamentPlan) {
  return (plan.knockoutTree ?? plan.poolKnockoutTree)?.matchesPerRound ?? [];
}

export function tournamentMatchTotals(
  plan: FriendlyTournamentPlan,
): TournamentMatchTotals {
  const pool = plan.rounds?.poolMatches ?? 0;
  const knockout = sum(knockoutRoundMatches(plan));
  return { pool, knockout, total: pool + knockout };
}

export function matchCountLabel(matches: number) {
  return matches === 1 ? "1 Match" : `${matches} Matches`;
}

export const PICK_COURTS_FOR_SCHEDULE =
  "Pick Courts in use to see the schedule.";

export type TournamentScheduleSummary =
  | { kind: "pickCourts"; message: string }
  | {
      kind: "schedule";
      title: string;
      detail: string;
      lastFinish: string;
      overruns: boolean;
    };

function matchesPart(totals: TournamentMatchTotals) {
  const parts = [
    totals.pool > 0 ? friendlyTournamentMatchCountLabel(totals.pool) : null,
    totals.knockout > 0 ? knockoutMatchCountLabel(totals.knockout) : null,
  ].filter((part): part is string => part !== null);
  return parts.join(" and ");
}

export function tournamentScheduleSummary(input: {
  plan: FriendlyTournamentPlan;
  day: string;
  startTime: string;
  finishTime: string;
  matchMinutes: string;
  courtCount: number;
  now: Date;
}): TournamentScheduleSummary | null {
  const totals = tournamentMatchTotals(input.plan);
  if (totals.total === 0) {
    return null;
  }
  if (input.courtCount < 1) {
    return { kind: "pickCourts", message: PICK_COURTS_FOR_SCHEDULE };
  }
  const minutes = parseCreateMatchMinutes(input.matchMinutes);
  const when = validateFriendlyGameWhen(
    input.day,
    input.startTime,
    input.finishTime,
    input.now,
  );
  if (!minutes.ok || !when.ok) {
    return null;
  }
  const fit = oneDayFit({
    start: when.windowStart,
    finish: when.windowEnd,
    roundMatches: [
      ...(input.plan.rounds?.roundMatches ?? []),
      ...knockoutRoundMatches(input.plan),
    ],
    courtCount: input.courtCount,
    matchMinutes: minutes.minutes,
  });
  if (fit.slotCount === null || fit.lastFinish === null) {
    return null;
  }
  const lastFinish = formatGameClock(fit.lastFinish);
  const slots = fit.slotCount === 1 ? "1 slot" : `${fit.slotCount} slots`;
  return {
    kind: "schedule",
    title: `${matchCountLabel(totals.total)}, ${formatTimeSlotLabel(input.startTime)} to ${lastFinish}`,
    detail: `${matchesPart(totals)}. ${courtCountValue(input.courtCount)}, ${minutes.minutes} minutes a Match, ${slots} back to back.`,
    lastFinish,
    overruns: fit.overruns,
  };
}
