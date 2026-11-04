/**
 * The Season a Game links to (design "Edit game flow" 1a–1d). A Group Game
 * carries at most one Season of its Group; its result counts in that
 * Season's Standing and nowhere else. Only a Season whose window holds the
 * game day and is not closed can be picked.
 */

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth } from "./format-game-start";
import {
  dayKeyToInstant,
  formatSeasonRange,
  groupSeasonStatus,
  sortSeasonsNewestFirst,
  type GroupSeasonData,
  type GroupSeasonStatus,
} from "./group-season";

/** The badge is an id the Apps compare against; `seasonBadgeLabel` is its copy. */
export const SEASON_BADGE: Record<GroupSeasonStatus, string> = {
  upcoming: "UPCOMING",
  active: "ACTIVE",
  closed: "CLOSED",
};

export function seasonBadgeLabel(status: GroupSeasonStatus, locale: Locale) {
  return messagesFor(locale).createGame.season.badge[status];
}

/** `"Mon 2 Nov"` for a `YYYY-MM-DD` day key. */
export function formatGameDayKey(dayKey: string, locale: Locale) {
  return formatDayMonth(dayKeyToInstant(dayKey), locale, { weekday: "short" });
}

export function seasonContainsDay(
  season: Pick<GroupSeasonData, "startsOn" | "endsOn">,
  dayKey: string,
): boolean {
  return season.startsOn <= dayKey && dayKey <= season.endsOn;
}

/** Whether a Game on `dayKey` may link to this Season today. */
export function seasonOpenForDay(
  season: GroupSeasonData,
  dayKey: string,
  now: Date,
): boolean {
  return (
    seasonContainsDay(season, dayKey) &&
    groupSeasonStatus(season, now) !== "closed"
  );
}

export function seasonsOpenForDay<T extends GroupSeasonData>(
  seasons: readonly T[],
  dayKey: string,
  now: Date,
): T[] {
  return seasons.filter((season) => seasonOpenForDay(season, dayKey, now));
}

export type GameSeasonChoice = {
  /** `null` is the "No season" row. */
  id: string | null;
  name: string;
  dates: string;
  note: string;
  badge: string | null;
  selectable: boolean;
};

function seasonChoiceNote(
  season: GroupSeasonData,
  dayKey: string,
  now: Date,
  locale: Locale,
): string {
  const m = messagesFor(locale).createGame.season;
  if (groupSeasonStatus(season, now) === "closed") {
    return m.closedAndLocked;
  }
  if (seasonContainsDay(season, dayKey)) {
    return m.fallsInside(formatGameDayKey(dayKey, locale));
  }
  return season.startsOn > dayKey ? m.startsAfter : m.endedBefore;
}

/**
 * The picker rows (design 1b): "No season", then the Seasons that fit the
 * game day, then the rest newest first, dimmed.
 */
export function gameSeasonChoices(
  seasons: readonly GroupSeasonData[],
  dayKey: string,
  now: Date,
  locale: Locale,
): GameSeasonChoice[] {
  const m = messagesFor(locale).createGame.season;
  const ordered = sortSeasonsNewestFirst(seasons);
  const fitting = ordered.filter((season) =>
    seasonOpenForDay(season, dayKey, now),
  );
  const rest = ordered.filter(
    (season) => !seasonOpenForDay(season, dayKey, now),
  );
  return [
    {
      id: null,
      name: m.none,
      dates: m.friendly,
      note: m.noneNote,
      badge: null,
      selectable: true,
    },
    ...[...fitting, ...rest].map((season) => ({
      id: season.id,
      name: season.name,
      dates: formatSeasonRange(season, locale),
      note: seasonChoiceNote(season, dayKey, now, locale),
      badge: SEASON_BADGE[groupSeasonStatus(season, now)],
      selectable: seasonOpenForDay(season, dayKey, now),
    })),
  ];
}

/** `"Gooz of Arad has 1 season open for Mon 2 Nov."` */
export function seasonLinkRowNote(
  groupName: string,
  openCount: number,
  dayKey: string,
  locale: Locale,
) {
  return messagesFor(locale).createGame.season.rowNote(
    groupName,
    openCount,
    formatGameDayKey(dayKey, locale),
  );
}

/** `"Gooz of Arad. The game day, Mon 2 Nov, decides which seasons fit."` */
export function seasonPickerSubtitle(
  groupName: string,
  dayKey: string,
  locale: Locale,
) {
  return messagesFor(locale).createGame.season.pickerSubtitle(
    groupName,
    formatGameDayKey(dayKey, locale),
  );
}

export function seasonLinkActionLabel(
  choice: Pick<GameSeasonChoice, "id" | "name">,
  locale: Locale,
) {
  const m = messagesFor(locale).createGame.season;
  return choice.id === null ? m.keepFriendly : m.link(choice.name);
}

/**
 * `"Players see “Season 3” on the game and in the invite. Unlink any time
 * before the score is confirmed."`
 */
export function seasonLinkedNote(
  season: Pick<GroupSeasonData, "name">,
  locale: Locale,
) {
  return messagesFor(locale).createGame.season.linkedNote(season.name);
}

export type GameSeasonFix = {
  season: GroupSeasonData;
  /** The Season that holds the new day, when one does. */
  replacement: GroupSeasonData | null;
  endsLine: string;
  line: string;
  keepLine: string;
  moveLabel: string | null;
};

/**
 * Design 1d: the linked Season no longer holds the game day, so the
 * Organizer must move the link, unlink, or move the day back.
 */
export function gameSeasonFix(
  linked: GroupSeasonData | null,
  seasons: readonly GroupSeasonData[],
  dayKey: string,
  now: Date,
  locale: Locale,
): GameSeasonFix | null {
  if (!linked || seasonContainsDay(linked, dayKey)) {
    return null;
  }
  const m = messagesFor(locale).createGame.season;
  const replacement = seasonsOpenForDay(seasons, dayKey, now)[0] ?? null;
  const day = formatGameDayKey(dayKey, locale);
  const before = dayKey < linked.startsOn;
  const edge = formatDayMonth(
    dayKeyToInstant(before ? linked.startsOn : linked.endsOn),
    locale,
  );
  return {
    season: linked,
    replacement,
    endsLine: before ? m.starts(edge) : m.ends(edge),
    line: replacement
      ? m.outsideCovered(day, linked.name, replacement.name)
      : m.outsideNone(day, linked.name),
    keepLine: before
      ? m.keepForward(edge, linked.name)
      : m.keepBack(edge, linked.name),
    moveLabel: replacement ? m.moveTo(replacement.name) : null,
  };
}

/** `"Sun 1 Feb is outside Season 3"` */
export function seasonOutsideDayMessage(
  season: Pick<GroupSeasonData, "name">,
  dayKey: string,
  locale: Locale,
) {
  return messagesFor(locale).createGame.season.outsideDay(
    formatGameDayKey(dayKey, locale),
    season.name,
  );
}
