/**
 * Seasons (design "Seasons" 1a–1l): an optional date window an admin sets on
 * a Group. The Standing, W/D/L and games played are scoped to it; a Level is
 * not. A Group without Seasons keeps its all-time Standing.
 *
 * Dates are product-timezone days, inclusive on both ends, carried as
 * `YYYY-MM-DD` keys so a day never shifts with the reader's clock.
 */

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

/** Games a member plays in the lens before they hold a rank. */
export const SEASON_MIN_RANKED_GAMES = 3;

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

export const SEASON_SETTINGS_INTRO =
  "A season scopes the standing to a date window. Levels are never reset by a season.";

export const SEASON_NEW_STANDING_NOTE =
  "Standing starts empty for the new season. Levels, W/L history and earlier seasons stay as they are.";

export const SEASON_STATUS_LABEL: Record<GroupSeasonStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  closed: "Closed",
};

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
) {
  return `Day ${seasonDayNumber(season, now)} of ${seasonLengthDays(season)}`;
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
) {
  return `${formatDayMonth(dayKeyToInstant(season.startsOn))} – ${formatDayMonth(dayKeyToInstant(season.endsOn))}`;
}

/** `"Starts Sunday 9 Nov"`. */
export function seasonStartsLine(season: Pick<GroupSeasonData, "startsOn">) {
  const start = dayKeyToInstant(season.startsOn);
  return `Starts ${formatWeekday(start, "long")} ${formatDayMonth(start)}`;
}

/** `"Locked at close, 31 Oct"`. */
export function seasonLockedLine(season: Pick<GroupSeasonData, "endsOn">) {
  return `Locked at close, ${formatDayMonth(dayKeyToInstant(season.endsOn))}`;
}

/** `"41 games counted"`. */
export function seasonGamesCountedLine(count: number) {
  return `${count} ${count === 1 ? "game" : "games"} counted`;
}

export function seasonsOverlap(
  a: Pick<GroupSeasonData, "startsOn" | "endsOn">,
  b: Pick<GroupSeasonData, "startsOn" | "endsOn">,
): boolean {
  return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;
}

export const SEASON_OVERLAP_MESSAGE = "Seasons can't overlap.";
export const SEASON_ORDER_MESSAGE = "The season must end after it starts.";

/** Why these dates cannot be a new Season, or `null` when they can. */
export function seasonDatesError(
  dates: { startsOn: string; endsOn: string },
  existing: readonly Pick<GroupSeasonData, "startsOn" | "endsOn">[],
): string | null {
  if (!isDayKey(dates.startsOn) || !isDayKey(dates.endsOn)) {
    return "Pick a start and an end day.";
  }
  if (dates.endsOn < dates.startsOn) {
    return SEASON_ORDER_MESSAGE;
  }
  if (existing.some((season) => seasonsOverlap(season, dates))) {
    return SEASON_OVERLAP_MESSAGE;
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
): SeasonLensChip[] {
  return [
    ...sortSeasonsNewestFirst(seasons).map((season) => ({
      seasonId: season.id,
      label: season.name,
    })),
    { seasonId: null, label: "All-time" },
  ];
}

/** `"Season 4"` when the Group has three Seasons. */
export function suggestedSeasonName(seasons: readonly unknown[]) {
  return `Season ${seasons.length + 1}`;
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
): string {
  const error = seasonDatesError(dates, existing);
  if (error) {
    return error;
  }
  const days = seasonLengthDays(dates);
  const previous = sortSeasonsNewestFirst(
    existing.filter((season) => season.endsOn < dates.startsOn),
  )[0];
  const parts = [`${days} ${days === 1 ? "day" : "days"}.`];
  if (previous) {
    const gap = productDaysBetween(
      dayKeyToInstant(previous.endsOn),
      dayKeyToInstant(dates.startsOn),
    );
    parts.push(
      gap === 1
        ? `Starts the day after ${previous.name} closes.`
        : `Starts ${gap - 1} ${gap - 1 === 1 ? "day" : "days"} after ${previous.name} closes.`,
    );
  }
  parts.push(SEASON_OVERLAP_MESSAGE);
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
export function seasonBoundaryLabel(season: GroupSeasonData) {
  return `${season.name} / ${formatSeasonRange(season)}`.toUpperCase();
}

/** `"Today, 60 days early"` for the close sheet (design 1l). */
export function seasonCloseEndsLine(
  season: Pick<GroupSeasonData, "endsOn">,
  now: Date,
) {
  const early = productDaysBetween(now, dayKeyToInstant(season.endsOn));
  if (early <= 0) {
    return "Today";
  }
  return `Today, ${early} ${early === 1 ? "day" : "days"} early`;
}

export function closeSeasonTitle(season: Pick<GroupSeasonData, "name">) {
  return `Close ${season.name}?`;
}

export function closeSeasonActionLabel(season: Pick<GroupSeasonData, "name">) {
  return `Close ${season.name} early`;
}

/**
 * `"The standing locks in its current order. 41 confirmed games count. 2
 * games still waiting on a score won't."`
 */
export function closeSeasonBody(input: {
  gamesCounted: number;
  awaitingScoreCount: number;
}) {
  const counted = `${input.gamesCounted} confirmed ${input.gamesCounted === 1 ? "game counts" : "games count"}.`;
  const waiting =
    input.awaitingScoreCount > 0
      ? ` ${input.awaitingScoreCount} ${input.awaitingScoreCount === 1 ? "game" : "games"} still waiting on a score won't.`
      : "";
  return `The standing locks in its current order. ${counted}${waiting}`;
}

export function seasonCreatedToast(season: Pick<GroupSeasonData, "name">) {
  return `${season.name} created`;
}

export function seasonClosedToast(season: Pick<GroupSeasonData, "name">) {
  return `${season.name} closed`;
}
