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
