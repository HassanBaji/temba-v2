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
  levelBandSelectOvr,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import { courtCountValue, oneDayFit } from "@repo/domain/tournament-sizing";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type LevelRangeSummary = {
  minimum: string;
  maximum: string;
  open: boolean;
};

/** The picked bounds: bands, or `OVR 58` on football, which still stores bands. */
export function levelRangeSummary(
  min: LevelBandSelectValue,
  max: LevelBandSelectValue,
  locale: Locale,
  sport?: string | null,
): LevelRangeSummary {
  const messages = messagesFor(locale);
  const unsetBound = messages.mobileCreateGame.levelRange.any;
  const boundLabel = (value: LevelBandSelectValue, bound: "min" | "max") => {
    if (value === LEVEL_BAND_SELECT_NONE) {
      return unsetBound;
    }
    if (sport !== "football") {
      return value;
    }
    const ovr = levelBandSelectOvr(value, bound);
    return ovr == null ? unsetBound : messages.level.ovr(ovr);
  };
  return {
    minimum: boundLabel(min, "min"),
    maximum: boundLabel(max, "max"),
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

export function matchCountLabel(matches: number, locale: Locale) {
  return messagesFor(locale).mobileCreateGame.header.matchCount(matches);
}

export type TournamentScheduleSummary =
  | { kind: "pickCourts"; message: string }
  | {
      kind: "schedule";
      title: string;
      detail: string;
      lastFinish: string;
      overruns: boolean;
    };

function matchesPart(totals: TournamentMatchTotals, locale: Locale) {
  const parts = [
    totals.pool > 0
      ? friendlyTournamentMatchCountLabel(totals.pool, locale)
      : null,
    totals.knockout > 0
      ? knockoutMatchCountLabel(totals.knockout, locale)
      : null,
  ].filter((part): part is string => part !== null);
  const [first, second] = parts;
  if (first !== undefined && second !== undefined) {
    return messagesFor(locale).tournament.listAnd(first, second);
  }
  return first ?? "";
}

export function tournamentScheduleSummary(input: {
  plan: FriendlyTournamentPlan;
  day: string;
  startTime: string;
  finishTime: string;
  matchMinutes: string;
  courtCount: number;
  now: Date;
  locale: Locale;
}): TournamentScheduleSummary | null {
  const { locale } = input;
  const m = messagesFor(locale).mobileCreateGame.schedule;
  const totals = tournamentMatchTotals(input.plan);
  if (totals.total === 0) {
    return null;
  }
  if (input.courtCount < 1) {
    return { kind: "pickCourts", message: m.pickCourts };
  }
  const minutes = parseCreateMatchMinutes(input.matchMinutes, locale);
  const when = validateFriendlyGameWhen(
    input.day,
    input.startTime,
    input.finishTime,
    locale,
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
  const lastFinish = formatGameClock(fit.lastFinish, locale);
  return {
    kind: "schedule",
    title: m.title(
      matchCountLabel(totals.total, locale),
      formatTimeSlotLabel(input.startTime, locale),
      lastFinish,
    ),
    detail: m.detail(
      matchesPart(totals, locale),
      courtCountValue(input.courtCount, locale),
      minutes.minutes,
      fit.slotCount,
    ),
    lastFinish,
    overruns: fit.overruns,
  };
}
