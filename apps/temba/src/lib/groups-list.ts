/**
 * Groups list presentation helpers (`.scratch/groups-redesign/spec.md` §1.1).
 */

import { formatWeekday } from "~/lib/format-game-start";
import { memberCountLabel } from "~/lib/member-count-label";

/**
 * A Group row's meta line: `"{n} members, you are rank {r}"`, or just the
 * member count when the viewer holds no standing position yet. `member` is
 * pluralised.
 */
export function groupRowMetaLine(input: {
  memberCount: number;
  standingPosition: number | null | undefined;
}) {
  const members = memberCountLabel(input.memberCount);
  const rank = input.standingPosition;
  if (rank == null || !Number.isFinite(rank)) {
    return members;
  }
  return `${members}, you are rank ${rank}`;
}

/** The next Game's weekday abbreviation, as the design draws it: `Thu`. */
export function groupNextGameWeekday(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatWeekday(date, "short");
}
