/**
 * Groups list presentation helpers (`.scratch/groups-redesign/spec.md` §1.1).
 */

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatWeekday } from "./format-game-start";
import { gameDayStart } from "./game-day";
import { memberCountLabel } from "./member-count-label";

/**
 * A Group row's meta line: `"{n} members, you are rank {r}"`, or just the
 * member count when the viewer holds no standing position yet. `member` is
 * pluralised.
 */
export function groupRowMetaLine(input: {
  memberCount: number;
  standingPosition: number | null | undefined;
  locale: Locale;
}) {
  const members = memberCountLabel(input.memberCount, input.locale);
  const rank = input.standingPosition;
  if (rank == null || !Number.isFinite(rank)) {
    return members;
  }
  return messagesFor(input.locale).group.list.rowMeta(members, rank);
}

/** The next Game's weekday abbreviation, as the design draws it: `Thu`. */
export function groupNextGameWeekday(startTime: Date | string, locale: Locale) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatWeekday(gameDayStart(date), "short", locale);
}
