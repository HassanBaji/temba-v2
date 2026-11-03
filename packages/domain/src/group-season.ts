/**
 * Seasons (design "Seasons" 1a–1l): an optional date window an admin sets on
 * a Group. The Standing, W/D/L and games played are scoped to it; a Level is
 * not. A Group without Seasons keeps its all-time Standing.
 *
 * Dates are product-timezone days, inclusive on both ends, carried as
 * `YYYY-MM-DD` keys so a day never shifts with the reader's clock.
 */

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth, formatWeekday } from "./format-game-start";
import {
  addProductDays,
  productDayKey,
  productDaysBetween,
  startOfProductDay,
  zonedDateTimeToInstant,
} from "./product-timezone";

export const SEASON_NAME_MAX_LENGTH = 40;

/** Points per game: win, draw, loss. */
export const SEASON_POINTS = { win: 3, draw: 1, loss: 0 } as const;

/** Games a member plays in the lens before they hold a rank: one result is enough. */
export const SEASON_MIN_RANKED_GAMES = 1;

export type GroupSeasonStatus = "upcoming" | "active" | "closed";

export type GroupSeasonData = {
  id: string;
  name: string;
  /** `YYYY-MM-DD`, a product-timezone day. */
  startsOn: string;
  /** `YYYY-MM-DD`, a product-timezone day, inclusive. */
  endsOn: string;
  /** Stamped when an admin closed the Season early. */
  closedAt: Date | string | null;
};

export function seasonStatusLabel(status: GroupSeasonStatus, locale: Locale) {
  return messagesFor(locale).group.season.status[status];
}

export function parseDayKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    throw new Error(`Not a day key: ${key}`);
  }
  return { year, month, day };
}

/** The instant a product day begins. */
export function dayKeyToInstant(key: string): Date {
  return zonedDateTimeToInstant(parseDayKey(key));
}

export function isDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const { year, month, day } = parseDayKey(value);
  return productDayKey(dayKeyToInstant(value)) === value && year > 2000
    ? month >= 1 && month <= 12 && day >= 1 && day <= 31
    : false;
}

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/**
 * The instants a Season's Matches fall between: the start of its first day,
 * and the start of the day after its last day. A Season closed early stops
 * at the closing instant, so nothing played after the lock gets in.
 */
export function groupSeasonWindow(
  season: Pick<GroupSeasonData, "startsOn" | "endsOn" | "closedAt">,
): { start: Date; endExclusive: Date } {
  const start = dayKeyToInstant(season.startsOn);
  const dayAfterEnd = addProductDays(dayKeyToInstant(season.endsOn), 1);
  const closedAt = season.closedAt ? asDate(season.closedAt) : null;
  const endExclusive =
    closedAt && closedAt.getTime() < dayAfterEnd.getTime()
      ? closedAt
      : dayAfterEnd;
  return { start, endExclusive };
}

export function isInSeasonWindow(
  season: Pick<GroupSeasonData, "startsOn" | "endsOn" | "closedAt">,
  playedAt: Date,
): boolean {
  const { start, endExclusive } = groupSeasonWindow(season);
  const at = playedAt.getTime();
  return at >= start.getTime() && at < endExclusive.getTime();
}

export function groupSeasonStatus(
  season: Pick<GroupSeasonData, "startsOn" | "endsOn" | "closedAt">,
  now: Date,
): GroupSeasonStatus {
  if (season.closedAt) {
    return "closed";
  }
  const today = productDayKey(now);
  if (today < season.startsOn) {
    return "upcoming";
  }
  if (today > season.endsOn) {
    return "closed";
  }
  return "active";
}

/** Days in the Season, both ends included. */
export function seasonLengthDays(
  season: Pick<GroupSeasonData, "startsOn" | "endsOn">,
): number {
  return (
    productDaysBetween(
      dayKeyToInstant(season.startsOn),
      dayKeyToInstant(season.endsOn),
    ) + 1
  );
}

/** 1-based day of the Season `now` falls on, clamped to its length. */
export function seasonDayNumber(
  season: Pick<GroupSeasonData, "startsOn" | "endsOn">,
  now: Date,
): number {
  const day = productDaysBetween(dayKeyToInstant(season.startsOn), now) + 1;
  return Math.min(Math.max(day, 1), seasonLengthDays(season));
}

/** `"Day 35 of 92"`. */
export function seasonProgressLine(
  season: Pick<GroupSeasonData, "startsOn" | "endsOn">,
  now: Date,
  locale: Locale,
) {
  return messagesFor(locale).group.season.progress(
    seasonDayNumber(season, now),
    seasonLengthDays(season),
  );
}

/** 0 to 1, how far through the Season `now` is. */
export function seasonProgress(
  season: Pick<GroupSeasonData, "startsOn" | "endsOn">,
  now: Date,
) {
  return seasonDayNumber(season, now) / seasonLengthDays(season);
}

/** `"1 Nov – 31 Jan"`. */
export function formatSeasonRange(
  season: Pick<GroupSeasonData, "startsOn" | "endsOn">,
  locale: Locale,
) {
  return messagesFor(locale).group.season.range(
    formatDayMonth(dayKeyToInstant(season.startsOn), locale),
    formatDayMonth(dayKeyToInstant(season.endsOn), locale),
  );
}

/** `"Starts Sunday 9 Nov"`. */
export function seasonStartsLine(
  season: Pick<GroupSeasonData, "startsOn">,
  locale: Locale,
) {
  const start = dayKeyToInstant(season.startsOn);
  return messagesFor(locale).group.season.startsLine(
    formatWeekday(start, "long", locale),
    formatDayMonth(start, locale),
  );
}

/** `"Locked at close, 31 Oct"`. */
export function seasonLockedLine(
  season: Pick<GroupSeasonData, "endsOn">,
  locale: Locale,
) {
  return messagesFor(locale).group.season.lockedLine(
    formatDayMonth(dayKeyToInstant(season.endsOn), locale),
  );
}

/** `"41 games counted"`. */
export function seasonGamesCountedLine(count: number, locale: Locale) {
  return messagesFor(locale).group.season.gamesCounted(count);
}

export function seasonsOverlap(
  a: Pick<GroupSeasonData, "startsOn" | "endsOn">,
  b: Pick<GroupSeasonData, "startsOn" | "endsOn">,
): boolean {
  return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;
}

export function seasonOverlapMessage(locale: Locale) {
  return messagesFor(locale).group.season.overlapMessage;
}

export function seasonOrderMessage(locale: Locale) {
  return messagesFor(locale).group.season.orderMessage;
}

/** Why these dates cannot be a new Season, or `null` when they can. */
export function seasonDatesError(
  dates: { startsOn: string; endsOn: string },
  existing: readonly Pick<GroupSeasonData, "startsOn" | "endsOn">[],
  locale: Locale,
): string | null {
  const m = messagesFor(locale).group.season;
  if (!isDayKey(dates.startsOn) || !isDayKey(dates.endsOn)) {
    return m.pickDaysMessage;
  }
  if (dates.endsOn < dates.startsOn) {
    return m.orderMessage;
  }
  if (existing.some((season) => seasonsOverlap(season, dates))) {
    return m.overlapMessage;
  }
  return null;
}

/** Newest first: the Season that starts last leads. */
export function sortSeasonsNewestFirst<
  T extends Pick<GroupSeasonData, "startsOn">,
>(seasons: readonly T[]): T[] {
  return [...seasons].sort((a, b) =>
    b.startsOn < a.startsOn ? -1 : b.startsOn > a.startsOn ? 1 : 0,
  );
}

export function latestSeason<T extends Pick<GroupSeasonData, "startsOn">>(
  seasons: readonly T[],
): T | null {
  return sortSeasonsNewestFirst(seasons)[0] ?? null;
}

export function activeSeason<T extends GroupSeasonData>(
  seasons: readonly T[],
  now: Date,
): T | null {
  return (
    seasons.find((season) => groupSeasonStatus(season, now) === "active") ??
    null
  );
}

/**
 * The lens the Standing tab opens on: the active Season, else the next one
 * to start, else the latest closed one, else all-time (`null`).
 */
export function defaultSeasonLens(
  seasons: readonly GroupSeasonData[],
  now: Date,
): string | null {
  const active = activeSeason(seasons, now);
  if (active) {
    return active.id;
  }
  const upcoming = sortSeasonsNewestFirst(
    seasons.filter((season) => groupSeasonStatus(season, now) === "upcoming"),
  ).at(-1);
  if (upcoming) {
    return upcoming.id;
  }
  return latestSeason(seasons)?.id ?? null;
}

export type SeasonLensChip = { seasonId: string | null; label: string };

/** The chip row under the Season header: Seasons newest first, then All-time. */
export function seasonLensChips(
  seasons: readonly GroupSeasonData[],
  locale: Locale,
): SeasonLensChip[] {
  return [
    ...sortSeasonsNewestFirst(seasons).map((season) => ({
      seasonId: season.id,
      label: season.name,
    })),
    { seasonId: null, label: messagesFor(locale).group.season.allTime },
  ];
}

/** `"Season 4"` when the Group has three Seasons. */
export function suggestedSeasonName(
  seasons: readonly unknown[],
  locale: Locale,
) {
  return messagesFor(locale).group.season.suggestedName(seasons.length + 1);
}

/** The day after the latest Season ends, or today when there is none. */
export function suggestedSeasonStart(
  seasons: readonly Pick<GroupSeasonData, "startsOn" | "endsOn">[],
  now: Date,
): string {
  const latest = sortSeasonsNewestFirst(seasons)[0];
  const today = productDayKey(startOfProductDay(now));
  if (!latest) {
    return today;
  }
  const next = productDayKey(addProductDays(dayKeyToInstant(latest.endsOn), 1));
  return next > today ? next : today;
}

/** Three months on, minus a day, so a quarter reads `1 Feb – 30 Apr`. */
export function suggestedSeasonEnd(startsOn: string): string {
  const { year, month, day } = parseDayKey(startsOn);
  const end = zonedDateTimeToInstant({ year, month: month + 3, day });
  return productDayKey(addProductDays(end, -1));
}

/**
 * The line under the date fields (design 1k): `"89 days. Starts the day
 * after Season 3 closes. Seasons can't overlap."`
 */
export function newSeasonSummaryLine(
  dates: { startsOn: string; endsOn: string },
  existing: readonly GroupSeasonData[],
  locale: Locale,
): string {
  const m = messagesFor(locale).group.season;
  const error = seasonDatesError(dates, existing, locale);
  if (error) {
    return error;
  }
  const days = seasonLengthDays(dates);
  const previous = sortSeasonsNewestFirst(
    existing.filter((season) => season.endsOn < dates.startsOn),
  )[0];
  const parts = [m.summaryDays(days)];
  if (previous) {
    const gap = productDaysBetween(
      dayKeyToInstant(previous.endsOn),
      dayKeyToInstant(dates.startsOn),
    );
    parts.push(
      gap === 1
        ? m.startsDayAfter(previous.name)
        : m.startsDaysAfter(gap - 1, previous.name),
    );
  }
  parts.push(m.overlapMessage);
  return parts.join(" ");
}

/** The Season a Match played at `date` counts toward, if any. */
export function seasonForDate<T extends GroupSeasonData>(
  seasons: readonly T[],
  date: Date,
): T | null {
  return seasons.find((season) => isInSeasonWindow(season, date)) ?? null;
}

/** The hairline in the Games list (design 1d): `"SEASON 2 / 1 AUG – 31 OCT"`. */
export function seasonBoundaryLabel(season: GroupSeasonData, locale: Locale) {
  return `${season.name} / ${formatSeasonRange(season, locale)}`.toUpperCase();
}

/** `"Today, 60 days early"` for the close sheet (design 1l). */
export function seasonCloseEndsLine(
  season: Pick<GroupSeasonData, "endsOn">,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).group.season;
  const early = productDaysBetween(now, dayKeyToInstant(season.endsOn));
  if (early <= 0) {
    return m.closeEndsToday;
  }
  return m.closeEndsEarly(early);
}

export function closeSeasonTitle(
  season: Pick<GroupSeasonData, "name">,
  locale: Locale,
) {
  return messagesFor(locale).group.season.closeTitle(season.name);
}

export function closeSeasonActionLabel(
  season: Pick<GroupSeasonData, "name">,
  locale: Locale,
) {
  return messagesFor(locale).group.season.closeAction(season.name);
}

/**
 * `"The standing locks in its current order. 41 confirmed games count. 2
 * games still waiting on a score won't."`
 */
export function closeSeasonBody(input: {
  gamesCounted: number;
  awaitingScoreCount: number;
  locale: Locale;
}) {
  const m = messagesFor(input.locale).group.season;
  const parts = [m.closeBodyLead, m.closeBodyCounted(input.gamesCounted)];
  if (input.awaitingScoreCount > 0) {
    parts.push(m.closeBodyWaiting(input.awaitingScoreCount));
  }
  return parts.join(" ");
}

export function seasonCreatedToast(
  season: Pick<GroupSeasonData, "name">,
  locale: Locale,
) {
  return messagesFor(locale).group.season.createdToast(season.name);
}

export function seasonClosedToast(
  season: Pick<GroupSeasonData, "name">,
  locale: Locale,
) {
  return messagesFor(locale).group.season.closedToast(season.name);
}
