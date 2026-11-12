import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { initials } from "./initials";

export type GroupStandingData = {
  groupId: string;
  name: string;
  seasonId: string | null;
  position: number | null;
  memberCount: number;
  won: number;
  drawn: number;
  lost: number;
};

export type InYourGroupsRow = {
  groupId: string;
  name: string;
  initials: string;
  /** "9 won, 3 lost this season"; a Group with no Season reads all-time. */
  record: string;
  /** "#1 of 6", or "Unranked" before a result in the lens. */
  place: string;
  ranked: boolean;
  spoken: string;
};

function recordLine(row: GroupStandingData, locale: Locale) {
  const m = messagesFor(locale).rating.inYourGroups;
  if (row.seasonId === null) {
    return row.drawn > 0
      ? m.recordWithDrawn(row.won, row.drawn, row.lost)
      : m.record(row.won, row.lost);
  }
  return row.drawn > 0
    ? m.seasonRecordWithDrawn(row.won, row.drawn, row.lost)
    : m.seasonRecord(row.won, row.lost);
}

/**
 * "In your groups" (design 1b): each Group's won, lost and place in its
 * Standing. A padel Group has no Level and no tier (ADR-0066), so these rows
 * carry neither.
 */
export function inYourGroupsRows(
  rows: readonly GroupStandingData[],
  locale: Locale,
): InYourGroupsRow[] {
  const m = messagesFor(locale).rating.inYourGroups;
  return rows.map((row) => {
    const record = recordLine(row, locale);
    const place =
      row.position === null
        ? m.unranked
        : m.place(row.position, row.memberCount);
    return {
      groupId: row.groupId,
      name: row.name,
      initials: initials(row.name),
      record,
      place,
      ranked: row.position !== null,
      spoken: m.spoken(row.name, place, record),
    };
  });
}
