import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { bandFromLevel, formatLevel } from "./level";
import {
  displayLabelFromStoredBand,
  type AssignableDisplayLevelBand,
} from "./level-bands";

export type TeamLevel = {
  tenths: number;
  level: string;
  band: AssignableDisplayLevelBand;
};

function displayedTenths(level: string | null) {
  if (level == null) {
    return null;
  }
  const value = Number(level);
  return Number.isFinite(value) ? Math.round(value * 10) : null;
}

/**
 * Team Level: the mean displayed Level, in tenths, of the Roster members who
 * hold a Rating for the Team's sport. Null when no member does. Never a Rating.
 */
export function teamLevel(
  memberLevels: readonly (string | null)[],
): TeamLevel | null {
  const tenths = memberLevels
    .map(displayedTenths)
    .filter((value): value is number => value != null);
  if (tenths.length === 0) {
    return null;
  }
  const mean = Math.round(
    tenths.reduce((sum, value) => sum + value, 0) / tenths.length,
  );
  return {
    tenths: mean,
    level: formatLevel(mean / 10),
    band: displayLabelFromStoredBand(bandFromLevel(mean / 10)),
  };
}

/** "C, avg 2.8", or null for a Team with no rated member. */
export function teamLevelLabel(
  memberLevels: readonly (string | null)[],
  locale: Locale,
) {
  const value = teamLevel(memberLevels);
  return value
    ? messagesFor(locale).team.level.team(value.band, value.level)
    : null;
}
