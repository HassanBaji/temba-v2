import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import {
  footballBibName,
  footballSidesProblem,
  type FootballBib,
} from "./football-lineup";
import { formatGameClock, formatWeekday } from "./format-game-start";

export type FootballDraftSides = {
  slot1: readonly string[];
  slot2: readonly string[];
};

export type FootballDraftBibs = { slot1: FootballBib; slot2: FootballBib };

/**
 * Why two sides cannot be saved as a Draft line-up, or null when they can. A
 * draft may leave players on neither side (ADR-0107); it refuses only what
 * could never be published: nobody placed, a player on both sides or not
 * registered, one bib colour for both.
 */
export function footballDraftSaveProblem(
  draft: FootballDraftSides & { bibs: FootballDraftBibs },
  registeredUserIds: readonly string[],
  locale: Locale,
) {
  const m = messagesFor(locale).football.errors;
  const placed = [...draft.slot1, ...draft.slot2];
  if (placed.length === 0) {
    return m.draftNeedsPlayer;
  }
  if (new Set(placed).size !== placed.length) {
    return m.oneTeamOnly;
  }
  const roster = new Set(registeredUserIds);
  if (placed.some((userId) => !roster.has(userId))) {
    return m.registeredOnly;
  }
  if (draft.bibs.slot1 === draft.bibs.slot2) {
    return m.differentBibs;
  }
  return null;
}

/**
 * The Organizer's line on a saved draft and whether it can be published as
 * it stands. While players are still to place, or a side is too big, it reads
 * the Make teams problem and publishing waits.
 */
export function footballDraftSummary(
  draft: FootballDraftSides & { bibs: FootballDraftBibs },
  registeredUserIds: readonly string[],
  locale: Locale,
) {
  const placed = new Set([...draft.slot1, ...draft.slot2]);
  const problem = footballSidesProblem(
    {
      slot1: draft.slot1,
      slot2: draft.slot2,
      unplaced: registeredUserIds.filter((userId) => !placed.has(userId))
        .length,
    },
    {
      slot1: footballBibName(draft.bibs.slot1, 1, locale),
      slot2: footballBibName(draft.bibs.slot2, 2, locale),
    },
    locale,
  );
  return {
    line: problem ?? messagesFor(locale).football.draft.readyToPublish,
    canPublish: problem == null,
  };
}

/**
 * Who sees a draft, by Game kind: on a Group Game the Organizers, who are the
 * group's admins; on a Booking Game or a Public Game the creator alone.
 */
export function footballDraftVisibilityLine(
  game: { groupId: string | null },
  locale: Locale,
) {
  const m = messagesFor(locale).football.draft;
  return game.groupId ? m.visibleToGroupAdmins : m.visibleToYou;
}

/** "saved Fri 5:40 PM". */
export function footballDraftSavedLine(savedAt: Date, locale: Locale) {
  return messagesFor(locale).football.draft.savedAt(
    formatWeekday(savedAt, "short", locale),
    formatGameClock(savedAt, locale),
  );
}
