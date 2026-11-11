import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { sportLabel } from "./sport";

export type HomeStandingRow = {
  groupId: string;
  groupName: string | null;
  sport: string | null;
  /** Null until the User has a counted Match in the Season. */
  position: number | null;
  memberCount: number;
  /** The User's counted Matches in the Group's Season. */
  countedGames?: number;
};

export type HomeStandingRowView = {
  groupId: string;
  groupName: string;
  sportLabel: string | null;
  rank: string;
  ofCount: string;
};

export function homeStandingRowView(
  row: HomeStandingRow,
  locale: Locale,
): HomeStandingRowView {
  const m = messagesFor(locale).home.standing;
  return {
    groupId: row.groupId,
    groupName: row.groupName ?? m.groupFallback,
    sportLabel: sportLabel(row.sport, locale),
    rank: row.position == null ? m.unranked : `#${row.position}`,
    ofCount:
      row.position == null ? m.noCountedGames : m.ofCount(row.memberCount),
  };
}

/** Groups where the User has counted games, and how many fold into one row. */
export function standingSplit(rows: readonly HomeStandingRow[]): {
  counted: HomeStandingRow[];
  uncounted: number;
  total: number;
} {
  const counted = rows.filter((row) => row.position != null);
  return {
    counted,
    uncounted: rows.length - counted.length,
    total: rows.length,
  };
}
