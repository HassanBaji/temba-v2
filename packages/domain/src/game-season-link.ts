/**
 * The Season a Game links to (design "Edit game flow" 1a–1d). A Group Game
 * carries at most one Season of its Group; its result counts in that
 * Season's Standing and nowhere else. Only a Season whose window holds the
 * game day and is not closed can be picked.
 */

import { formatDayMonth } from "./format-game-start";
import {
  dayKeyToInstant,
  formatSeasonRange,
  groupSeasonStatus,
  sortSeasonsNewestFirst,
  type GroupSeasonData,
  type GroupSeasonStatus,
} from "./group-season";

export const NO_SEASON_LABEL = "No season";
export const NO_SEASON_DATES = "Friendly";
export const NO_SEASON_NOTE = "Result won't count in any standing.";
export const SEASON_LINK_ROW_TITLE = "Link to a season";
export const SEASON_SECTION_FRIENDLY_NOTE =
  "Without a season the game is a friendly. It still updates levels, just not a standing.";
export const SEASON_PICKER_LOCK_NOTE =
  "Only a confirmed final score counts in the standing. You can unlink until the score is confirmed.";
export const SEASON_COUNTS_LINE = "Counts in the standing";
export const SEASON_NEEDS_FIX_TAG = "Needs a fix";
export const SEASON_LOCKED_NOTE =
  "The score is confirmed, so the season can't change.";
export const KEEP_FRIENDLY_ACTION = "Keep as a friendly";
export const UNLINK_SEASON_ACTION = "Unlink season";
export const SEASON_CHANGE_ACTION = "Change";

export const SEASON_BADGE: Record<GroupSeasonStatus, string> = {
  upcoming: "UPCOMING",
  active: "ACTIVE",
  closed: "CLOSED",
};

/** `"Mon 2 Nov"` for a `YYYY-MM-DD` day key. */
export function formatGameDayKey(dayKey: string) {
  return formatDayMonth(dayKeyToInstant(dayKey), { weekday: "short" });
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
): string {
  if (groupSeasonStatus(season, now) === "closed") {
    return "Closed and locked.";
  }
  if (seasonContainsDay(season, dayKey)) {
    return `${formatGameDayKey(dayKey)} falls inside this window.`;
  }
  return season.startsOn > dayKey
    ? "Starts after the game day."
    : "Ended before the game day.";
}

/**
 * The picker rows (design 1b): "No season", then the Seasons that fit the
 * game day, then the rest newest first, dimmed.
 */
export function gameSeasonChoices(
  seasons: readonly GroupSeasonData[],
  dayKey: string,
  now: Date,
): GameSeasonChoice[] {
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
      name: NO_SEASON_LABEL,
      dates: NO_SEASON_DATES,
      note: NO_SEASON_NOTE,
      badge: null,
      selectable: true,
    },
    ...[...fitting, ...rest].map((season) => ({
      id: season.id,
      name: season.name,
      dates: formatSeasonRange(season),
      note: seasonChoiceNote(season, dayKey, now),
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
) {
  const count =
    openCount === 0
      ? "no season"
      : `${openCount} ${openCount === 1 ? "season" : "seasons"}`;
  return `${groupName} has ${count} open for ${formatGameDayKey(dayKey)}.`;
}

/** `"Gooz of Arad. The game day, Mon 2 Nov, decides which seasons fit."` */
export function seasonPickerSubtitle(groupName: string, dayKey: string) {
  return `${groupName}. The game day, ${formatGameDayKey(dayKey)}, decides which seasons fit.`;
}

export function seasonLinkActionLabel(
  choice: Pick<GameSeasonChoice, "id" | "name">,
) {
  return choice.id === null ? KEEP_FRIENDLY_ACTION : `Link ${choice.name}`;
}

/**
 * `"Players see “Season 3” on the game and in the invite. Unlink any time
 * before the score is confirmed."`
 */
export function seasonLinkedNote(season: Pick<GroupSeasonData, "name">) {
  return `Players see “${season.name}” on the game and in the invite. Unlink any time before the score is confirmed.`;
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
): GameSeasonFix | null {
  if (!linked || seasonContainsDay(linked, dayKey)) {
    return null;
  }
  const replacement = seasonsOpenForDay(seasons, dayKey, now)[0] ?? null;
  const day = formatGameDayKey(dayKey);
  const before = dayKey < linked.startsOn;
  const edge = formatDayMonth(
    dayKeyToInstant(before ? linked.startsOn : linked.endsOn),
  );
  return {
    season: linked,
    replacement,
    endsLine: before ? `starts ${edge}` : `ends ${edge}`,
    line: replacement
      ? `${day} is outside ${linked.name}. ${replacement.name} covers that day.`
      : `${day} is outside ${linked.name}. No season covers that day.`,
    keepLine: before
      ? `Or move the day forward to ${edge} or later to keep ${linked.name}.`
      : `Or move the day back to ${edge} or earlier to keep ${linked.name}.`,
    moveLabel: replacement ? `Move to ${replacement.name}` : null,
  };
}

export const GAME_SEASON_NOT_IN_GROUP_MESSAGE =
  "Pick a season of this Game's Group";
export const GAME_SEASON_CLOSED_MESSAGE = "That season is closed";
export const GAME_SEASON_SCORE_CONFIRMED_MESSAGE =
  "The score is confirmed, so the season can't change";
export const GAME_SEASON_NO_GROUP_MESSAGE =
  "Only a Group Game can link to a season";

/** `"Sun 1 Feb is outside Season 3"` */
export function seasonOutsideDayMessage(
  season: Pick<GroupSeasonData, "name">,
  dayKey: string,
) {
  return `${formatGameDayKey(dayKey)} is outside ${season.name}`;
}
