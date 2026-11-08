import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  CHALLENGE_SLOT_DAYS,
  CHALLENGE_TIMINGS,
  CHALLENGE_WEEKDAYS,
  challengeSlotInstant,
  isChallengeTiming,
  isChallengeWeekday,
  type ChallengeTiming,
} from "./challenge-form";
import {
  formatDayMonth,
  formatGameClock,
  formatGameStart,
  formatWeekday,
} from "./format-game-start";
import { addProductDays, zonedParts } from "./product-timezone";

/** A Proposal starts at least an hour ahead and within 30 days. */
export const PROPOSAL_MIN_LEAD_MINUTES = 60;
export const PROPOSAL_MAX_DAYS_AHEAD = 30;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** Start times the Accept sheet suggests inside each timing, in minutes after midnight. */
export const CHALLENGE_TIMING_STARTS: Record<
  ChallengeTiming,
  readonly number[]
> = {
  morning: [9 * 60, 10 * 60 + 30],
  afternoon: [14 * 60, 16 * 60],
  evening: [19 * 60, 20 * 60 + 30],
};

export type ProposalSlotProblem = "too_soon" | "too_far";

function instant(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function proposalSlotProblem(
  startsAt: Date,
  now: Date,
): ProposalSlotProblem | null {
  const lead = startsAt.getTime() - now.getTime();
  if (lead < PROPOSAL_MIN_LEAD_MINUTES * MS_PER_MINUTE) {
    return "too_soon";
  }
  if (lead > PROPOSAL_MAX_DAYS_AHEAD * MS_PER_DAY) {
    return "too_far";
  }
  return null;
}

export function proposalSlotMessage(
  problem: ProposalSlotProblem,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.errors;
  return problem === "too_soon"
    ? m.slotTooSoon
    : m.slotTooFar(PROPOSAL_MAX_DAYS_AHEAD);
}

function productDayKey(date: Date) {
  const { year, month, day } = zonedParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function productWeekday(date: Date) {
  const { year, month, day } = zonedParts(date);
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return CHALLENGE_WEEKDAYS[(sundayFirst + 6) % 7];
}

/**
 * The times a Proposal can pick: every picked day crossed with every picked
 * timing over the next two weeks (empty means any), plus the exact slots,
 * soonest first, keeping only those a Proposal may still take.
 */
export function challengeSuggestedSlots(
  challenge: {
    days: readonly string[];
    timings: readonly string[];
    exactSlots: readonly (Date | string)[];
  },
  now: Date,
): Date[] {
  const days = challenge.days.filter(isChallengeWeekday);
  const timings = challenge.timings.filter(isChallengeTiming);
  const pickedTimings = timings.length > 0 ? timings : CHALLENGE_TIMINGS;
  const candidates: Date[] = challenge.exactSlots.map(instant);
  for (let offset = 0; offset < CHALLENGE_SLOT_DAYS; offset += 1) {
    const day = addProductDays(now, offset);
    const weekday = productWeekday(day);
    if (days.length > 0 && (!weekday || !days.includes(weekday))) {
      continue;
    }
    const key = productDayKey(day);
    for (const timing of pickedTimings) {
      for (const minutes of CHALLENGE_TIMING_STARTS[timing]) {
        candidates.push(challengeSlotInstant(key, minutes));
      }
    }
  }
  const seen = new Set<number>();
  return candidates
    .filter((slot) => proposalSlotProblem(slot, now) == null)
    .filter((slot) => {
      if (seen.has(slot.getTime())) {
        return false;
      }
      seen.add(slot.getTime());
      return true;
    })
    .sort((a, b) => a.getTime() - b.getTime());
}

export type ChallengeSlotDay = {
  key: string;
  label: string;
  accessibilityLabel: string;
  slots: { startsAt: Date; label: string; accessibilityLabel: string }[];
};

/** Slots grouped by product day, for a day row and a time row. */
export function challengeSlotDays(
  slots: readonly (Date | string)[],
  locale: Locale,
): ChallengeSlotDay[] {
  const groups: ChallengeSlotDay[] = [];
  for (const slot of [...slots]
    .map(instant)
    .sort((a, b) => a.getTime() - b.getTime())) {
    const key = productDayKey(slot);
    let group = groups.find((candidate) => candidate.key === key);
    if (!group) {
      group = {
        key,
        label: formatDayMonth(slot, locale, { weekday: "short" }),
        accessibilityLabel: `${formatWeekday(slot, "long", locale)} ${formatDayMonth(slot, locale)}`,
        slots: [],
      };
      groups.push(group);
    }
    group.slots.push({
      startsAt: slot,
      label: formatGameClock(slot, locale),
      accessibilityLabel: formatGameStart(slot, locale),
    });
  }
  return groups;
}
