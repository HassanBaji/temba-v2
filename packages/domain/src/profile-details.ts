import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/**
 * What Settings collects about a User beyond name and phone: Your details,
 * Play windows and Match history visibility. The value lists are pinned to
 * the `@repo/db` enums by a parity test in `@repo/api`.
 */
export const GENDERS = ["male", "female", "unspecified"] as const;
export type Gender = (typeof GENDERS)[number];

export const PLAY_WINDOW_DAYS = ["weekday", "weekend"] as const;
export type PlayWindowDay = (typeof PLAY_WINDOW_DAYS)[number];

export const PLAY_WINDOW_PARTS = ["morning", "afternoon", "evening"] as const;
export type PlayWindowPart = (typeof PLAY_WINDOW_PARTS)[number];

export const PLAY_WINDOWS = [
  "weekday_morning",
  "weekday_afternoon",
  "weekday_evening",
  "weekend_morning",
  "weekend_afternoon",
  "weekend_evening",
] as const;
export type PlayWindow = (typeof PLAY_WINDOWS)[number];

export const MATCH_HISTORY_VISIBILITIES = [
  "everyone",
  "group_members",
  "only_me",
] as const;
export type MatchHistoryVisibility =
  (typeof MATCH_HISTORY_VISIBILITIES)[number];

/** Temba is for players 16 and over. */
export const MINIMUM_AGE = 16;

/** Home areas offered in the picker, as stored. Area names, never addresses. */
export const HOME_AREAS = [
  "Adliya",
  "Amwaj",
  "Arad",
  "Budaiya",
  "Diyar Al Muharraq",
  "Hamad Town",
  "Hidd",
  "Isa Town",
  "Janabiya",
  "Juffair",
  "Manama",
  "Muharraq",
  "Riffa",
  "Saar",
  "Sanabis",
  "Seef",
  "Sitra",
  "Tubli",
  "Zallaq",
] as const;

/** Nationalities offered in the picker, as ISO 3166-1 alpha-2 codes. */
export const NATIONALITIES = [
  "BH",
  "SA",
  "AE",
  "KW",
  "QA",
  "OM",
  "EG",
  "JO",
  "LB",
  "SY",
  "IN",
  "PK",
  "PH",
  "GB",
  "US",
  "ES",
  "FR",
  "IT",
  "DE",
  "AR",
  "BR",
] as const;
export type Nationality = (typeof NATIONALITIES)[number];

export function isNationality(value: string | null | undefined) {
  return NATIONALITIES.includes(value as Nationality);
}

export function playWindow(
  day: PlayWindowDay,
  part: PlayWindowPart,
): PlayWindow {
  return `${day}_${part}`;
}

/** Whole years between a `YYYY-MM-DD` birth date and `today` (also `YYYY-MM-DD`). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  if (!by || !bm || !bd || !ty || !tm || !td) {
    return Number.NaN;
  }
  const hadBirthday = tm > bm || (tm === bm && td >= bd);
  return ty - by - (hadBirthday ? 0 : 1);
}

/** Ten-year bracket others see instead of a birth date: 16 to 24, 25 to 34 … 55+. */
export function ageGroup(age: number): { from: number; to: number | null } {
  if (age < 25) {
    return { from: MINIMUM_AGE, to: 24 };
  }
  if (age >= 55) {
    return { from: 55, to: null };
  }
  const from = Math.floor((age - 25) / 10) * 10 + 25;
  return { from, to: from + 9 };
}

/** A real calendar day, not in the future, at least `MINIMUM_AGE` years before `today`. */
export function birthDateProblem(
  birthDate: string,
  today: string,
): "invalid" | "tooYoung" | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) {
    return "invalid";
  }
  const [year, month, day] = [match[1], match[2], match[3]].map(Number) as [
    number,
    number,
    number,
  ];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    year < 1900
  ) {
    return "invalid";
  }
  const age = ageOn(birthDate, today);
  if (Number.isNaN(age) || age < 0) {
    return "invalid";
  }
  return age < MINIMUM_AGE ? "tooYoung" : null;
}

export function ageGroupLabel(age: number, locale: Locale) {
  const m = messagesFor(locale).you.details;
  const group = ageGroup(age);
  return group.to === null
    ? m.ageGroupAndOver(group.from)
    : m.ageGroup(group.from, group.to);
}

export function nationalityLabel(code: string, locale: Locale) {
  const names = messagesFor(locale).you.nationalities as Record<string, string>;
  return names[code] ?? code;
}

/** "Weekday evenings, weekend mornings", or null when none is picked. */
export function playWindowsSummary(
  windows: readonly PlayWindow[],
  locale: Locale,
): string | null {
  const m = messagesFor(locale).you.playWindows;
  const parts = PLAY_WINDOWS.filter((value) => windows.includes(value)).map(
    (value) => m.summaryPart[value],
  );
  return parts.length === 0 ? null : m.joinSummary(parts);
}

export function homeAreaLabel(area: string, locale: Locale) {
  const names = messagesFor(locale).you.areas as Record<string, string>;
  return names[area] ?? area;
}
