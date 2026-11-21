import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { shortName, type SideCaptains } from "./football-board";
import {
  footballBibName,
  footballSidesProblem,
  type FootballBib,
  type FootballDraftAnswer,
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
 * Why these Side captains cannot be named, or null when they can: each must
 * be a player on their own side, with an account (ADR-0108).
 */
export function footballSideCaptainProblem(
  captains: SideCaptains,
  sides: FootballDraftSides,
  accountUserIds: readonly string[],
  locale: Locale,
) {
  const m = messagesFor(locale).football.errors;
  const withAccount = new Set(accountUserIds);
  for (const [captain, side] of [
    [captains.slot1, sides.slot1],
    [captains.slot2, sides.slot2],
  ] as const) {
    if (captain == null) {
      continue;
    }
    if (!side.includes(captain)) {
      return m.captainOnSide;
    }
    if (!withAccount.has(captain)) {
      return m.captainNeedsAccount;
    }
  }
  return null;
}

export type FootballDraftAnswerState =
  | "none"
  | "waiting"
  | "approved"
  | "change_asked";

function samePlayers(a: readonly string[], b: readonly string[]) {
  const set = new Set(a);
  return set.size === new Set(b).size && b.every((id) => set.has(id));
}

/**
 * A side's Captain's answer as it reads now. Nobody to ask without a Side
 * captain, or when the captain is an Organizer of the Game. An answer counts
 * only for the exact players it was given for; otherwise the side waits.
 */
export function captainAnswerState(
  answer: {
    answer: FootballDraftAnswer;
    answeredPlayerIds: readonly string[];
  } | null,
  sidePlayerIds: readonly string[],
  sideCaptain: { isOrganizer: boolean } | null,
): FootballDraftAnswerState {
  if (!sideCaptain || sideCaptain.isOrganizer) {
    return "none";
  }
  if (!answer || !samePlayers(answer.answeredPlayerIds, sidePlayerIds)) {
    return "waiting";
  }
  return answer.answer;
}

/** What the draft card says about the Side captains when nothing is to place. */
function captainsLine(
  captains: SideCaptains,
  states: { slot1: FootballDraftAnswerState; slot2: FootballDraftAnswerState },
  inGroup: boolean,
  locale: Locale,
) {
  const m = messagesFor(locale).football.draft;
  const asked = [states.slot1, states.slot2].filter(
    (state) => state !== "none",
  );
  if (asked.length === 0) {
    const named = [captains.slot1, captains.slot2].some((id) => id != null);
    if (named) {
      return m.readyToPublish;
    }
    return inGroup ? m.noCaptainsGroup : m.noCaptainsYou;
  }
  const approved = asked.filter((state) => state === "approved").length;
  if (approved === asked.length) {
    return asked.length === 2 ? m.bothCaptainsApproved : m.captainApproved;
  }
  return m.captainsApprovedOf(approved, asked.length);
}

/**
 * The Organizer's line on a saved draft and whether it can be published as
 * it stands. While players are still to place, or a side is too big, it reads
 * the Make teams problem and publishing waits. Otherwise, given the Side
 * captains and their answers, it says how many have approved; publishing
 * never waits on them.
 */
export function footballDraftSummary(
  draft: FootballDraftSides & {
    bibs: FootballDraftBibs;
    captains?: SideCaptains;
    answers?: {
      slot1: { state: FootballDraftAnswerState };
      slot2: { state: FootballDraftAnswerState };
    };
  },
  registeredUserIds: readonly string[],
  locale: Locale,
  game: { groupId: string | null } = { groupId: null },
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
  const ready =
    draft.captains && draft.answers
      ? captainsLine(
          draft.captains,
          {
            slot1: draft.answers.slot1.state,
            slot2: draft.answers.slot2.state,
          },
          game.groupId != null,
          locale,
        )
      : messagesFor(locale).football.draft.readyToPublish;
  return {
    line: problem ?? ready,
    canPublish: problem == null,
  };
}

/**
 * Who sees a draft, by Game kind: on a Group Game the Organizers, who are the
 * group's admins; on a Booking Game or a Public Game the creator alone. The
 * Side captains named on it see it too.
 */
export function footballDraftVisibilityLine(
  game: { groupId: string | null },
  locale: Locale,
  hasSideCaptains = false,
) {
  const m = messagesFor(locale).football.draft;
  if (hasSideCaptains) {
    return game.groupId
      ? m.visibleToGroupAdminsAndCaptains
      : m.visibleToYouAndCaptains;
  }
  return game.groupId ? m.visibleToGroupAdmins : m.visibleToYou;
}

/**
 * The line a Side captain reads under the draft: who saved it and who else
 * sees it ("A draft from Hassan H. Only the two captains and the organizers
 * can see it.").
 */
export function footballDraftCaptainViewLine(
  draft: { savedByName: string; captains: SideCaptains },
  game: { groupId: string | null },
  locale: Locale,
) {
  const m = messagesFor(locale).football.draft.captainView;
  const both = draft.captains.slot1 != null && draft.captains.slot2 != null;
  const seenBy = both
    ? game.groupId
      ? m.bothCaptainsAndOrganizers
      : m.bothCaptainsAndOrganizer
    : game.groupId
      ? m.youAndOrganizers
      : m.youAndOrganizer;
  return `${m.from(shortName(draft.savedByName))} ${seenBy}`;
}

/** "saved Fri 5:40 PM". */
export function footballDraftSavedLine(savedAt: Date, locale: Locale) {
  return messagesFor(locale).football.draft.savedAt(
    formatWeekday(savedAt, "short", locale),
    formatGameClock(savedAt, locale),
  );
}
