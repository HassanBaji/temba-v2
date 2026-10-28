import {
  filsToMajorInput,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";

export type PricingRuleDraft = {
  key: string;
  id?: string;
  courtId: string | null;
  weekdays: number[];
  startMinutes: number;
  endMinutes: number;
  rate: string;
  label: string;
};

export type SavedPricingRule = {
  id: string;
  courtId: string | null;
  weekdays: number[];
  startMinutes: number;
  endMinutes: number;
  hourlyRateFils: number;
  label: string | null;
};

export type PricingRuleInput = {
  id?: string;
  courtId: string | null;
  weekdays: number[];
  startMinutes: number;
  endMinutes: number;
  hourlyRateFils: number;
  label: string | null;
};

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
export const ALL_DAY_END_MINUTES = 1440;

let draftCounter = 0;

export function newDraftKey() {
  draftCounter += 1;
  return `draft-${draftCounter}`;
}

export function draftsFromRules(rules: SavedPricingRule[]): PricingRuleDraft[] {
  return rules.map((rule) => ({
    key: rule.id,
    id: rule.id,
    courtId: rule.courtId,
    weekdays: [...rule.weekdays],
    startMinutes: rule.startMinutes,
    endMinutes: rule.endMinutes,
    rate: filsToMajorInput(rule.hourlyRateFils),
    label: rule.label ?? "",
  }));
}

export function baseRateDraft(rate: string): PricingRuleDraft {
  return {
    key: newDraftKey(),
    courtId: null,
    weekdays: [...ALL_WEEKDAYS],
    startMinutes: 0,
    endMinutes: ALL_DAY_END_MINUTES,
    rate,
    label: "Base rate",
  };
}

export function withBaseRate(
  drafts: PricingRuleDraft[],
  rate: string,
): PricingRuleDraft[] {
  return [
    baseRateDraft(rate),
    ...drafts.filter((draft) => draft.courtId !== null),
  ];
}

export function isBaseRate(draft: PricingRuleDraft) {
  return (
    draft.courtId === null &&
    draft.weekdays.length === ALL_WEEKDAYS.length &&
    draft.startMinutes === 0 &&
    draft.endMinutes === ALL_DAY_END_MINUTES
  );
}

export function nextRuleDraft(
  courtId: string | null,
  slotMinutes: number,
): PricingRuleDraft {
  return {
    key: newDraftKey(),
    courtId,
    weekdays: [...ALL_WEEKDAYS],
    startMinutes: 17 * 60,
    endMinutes: Math.max(22 * 60, 17 * 60 + slotMinutes),
    rate: "",
    label: "",
  };
}

export function parseHourlyRate(
  value: string,
): { ok: true; fils: number } | { ok: false; message: string } {
  const parsed = parseOptionalPricePerPlayerFils(value);
  if (!parsed.ok || parsed.fils === null) {
    return {
      ok: false,
      message: "Enter an hourly rate with up to three decimal places",
    };
  }
  return { ok: true, fils: parsed.fils };
}

export function draftProblem(draft: PricingRuleDraft): string | null {
  if (draft.weekdays.length === 0) {
    return "Choose at least one weekday";
  }
  if (draft.endMinutes <= draft.startMinutes) {
    return "The rule must end after it starts";
  }
  const rate = parseHourlyRate(draft.rate);
  return rate.ok ? null : rate.message;
}

export function draftsToInput(
  drafts: PricingRuleDraft[],
): { ok: true; rules: PricingRuleInput[] } | { ok: false; message: string } {
  const rules: PricingRuleInput[] = [];
  for (const draft of drafts) {
    const problem = draftProblem(draft);
    if (problem) {
      return { ok: false, message: problem };
    }
    const rate = parseHourlyRate(draft.rate);
    if (!rate.ok) {
      return rate;
    }
    rules.push({
      ...(draft.id ? { id: draft.id } : {}),
      courtId: draft.courtId,
      weekdays: [...draft.weekdays].sort((a, b) => a - b),
      startMinutes: draft.startMinutes,
      endMinutes: draft.endMinutes,
      hourlyRateFils: rate.fils,
      label: draft.label.trim() === "" ? null : draft.label.trim(),
    });
  }
  return { ok: true, rules };
}

export const MAX_END_MINUTES = 1800;

export const WEEKDAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

/** `7:00 AM`, `11:30 PM`; minutes past midnight wrap onto the next day's clock. */
export function formatClock(minutes: number) {
  const inDay = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(inDay / 60);
  const minute = inDay % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
}

export function formatTimeWindow(startMinutes: number, endMinutes: number) {
  return `${formatClock(startMinutes)} to ${formatClock(endMinutes)}`;
}

export function rateTimeOptions(slotMinutes: number) {
  const options: { value: number; label: string }[] = [];
  for (let minutes = 0; minutes <= MAX_END_MINUTES; minutes += slotMinutes) {
    options.push({ value: minutes, label: formatClock(minutes) });
  }
  return options;
}

function circularRunStart(days: number[]): number | null {
  const set = new Set(days);
  for (const start of days) {
    let covered = true;
    for (let offset = 0; offset < days.length; offset += 1) {
      if (!set.has((start + offset) % 7)) {
        covered = false;
        break;
      }
    }
    if (covered) {
      return start;
    }
  }
  return null;
}

/** `All days`, `Sun to Thu`, `Thu, Fri`: the design's DAYS column. */
export function describeWeekdays(weekdays: number[]) {
  const days = [...new Set(weekdays)].sort((a, b) => a - b);
  if (days.length === 0) {
    return "No days";
  }
  if (days.length === 7) {
    return "All days";
  }
  const start = circularRunStart(days);
  if (start !== null && days.length >= 3) {
    const end = (start + days.length - 1) % 7;
    return `${WEEKDAY_SHORT[start]} to ${WEEKDAY_SHORT[end]}`;
  }
  const ordered =
    start === null ? days : days.map((_, index) => (start + index) % 7);
  return ordered.map((day) => WEEKDAY_SHORT[day]!).join(", ");
}

export function draftsAreEqual(a: PricingRuleDraft[], b: PricingRuleDraft[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}
