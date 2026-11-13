import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatOvr, ovrFromLevel } from "./football-ovr";
import { bandFromLevel, formatLevel } from "./level";
import {
  displayLabelFromStoredBand,
  type AssignableDisplayLevelBand,
} from "./level-bands";
import type { Sport } from "./sport";

export type TeamLevel = {
  tenths: number;
  level: string;
  band: AssignableDisplayLevelBand;
  /** Football only: the mean of the members' whole-number OVRs. */
  ovr: number | null;
};

/** A displayed Level ("2.8") or the continuous one; null without a Rating. */
type MemberLevel = string | number | null;

function levelValue(level: MemberLevel) {
  if (level == null) {
    return null;
  }
  const value = Number(level);
  return Number.isFinite(value) ? value : null;
}

function mean(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Team Level: the mean displayed Level, in tenths, of the Roster members who
 * hold a Rating for the Team's sport. Null when no member does. Never a
 * Rating. A football Team also reads the mean OVR of those members.
 */
export function teamLevel(
  memberLevels: readonly MemberLevel[],
  sport: Sport,
): TeamLevel | null {
  const levels = memberLevels
    .map(levelValue)
    .filter((value): value is number => value != null);
  if (levels.length === 0) {
    return null;
  }
  const tenths = Math.round(
    mean(levels.map((level) => Math.round(Number(formatLevel(level)) * 10))),
  );
  return {
    tenths,
    level: formatLevel(tenths / 10),
    band: displayLabelFromStoredBand(bandFromLevel(tenths / 10)),
    ovr:
      sport === "football"
        ? Math.round(
            mean(levels.map((level) => Math.round(ovrFromLevel(level)))),
          )
        : null,
  };
}

/** "C, avg 2.8", "C+, avg OVR 72" on football, or null for a Team with no rated member. */
export function teamLevelLabel(
  memberLevels: readonly MemberLevel[],
  sport: Sport,
  locale: Locale,
) {
  const value = teamLevel(memberLevels, sport);
  if (!value) {
    return null;
  }
  const m = messagesFor(locale);
  return value.ovr == null
    ? m.team.level.team(value.band, value.level)
    : m.rating.ovr.team(value.band, formatOvr(value.ovr));
}
