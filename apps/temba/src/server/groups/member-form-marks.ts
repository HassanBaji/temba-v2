/**
 * Form marks: a Group member's last five results, newest last, so the strip
 * reads left-to-right toward now (the same direction `home-recent-form`
 * reads). Derived per request from the Group's Matches — see
 * `.scratch/groups-redesign/spec.md` §6.2.
 *
 * Feed it the Matches of the Group's Games, cancelled Games already dropped.
 *
 * A Match only counts once it has been played: a scheduled Match the member
 * is seated on is not form yet, and a cancelled Match never becomes form.
 * A played Match reads `not-played` unless it is completed with a decisive
 * result for the member's slot — a Match awaiting result confirmation
 * (ADR-0011) and a Match with no score both land there. A drawn Match was
 * neither won nor lost, and the design draws only three marks, so it reads
 * `not-played` too.
 *
 * Fewer than five results return fewer marks; the strip is never padded.
 */

import { MatchStatusEnum } from "@repo/db/schema";

import { matchOutcome } from "~/server/games/match-outcome";
import {
  outcomeForSlot,
  seatedUserSlotOnMatch,
  type MatchSlotOccupants,
} from "~/server/games/match-slots";

export const GROUP_FORM_MARK_LIMIT = 5;

export type FormMark = "won" | "lost" | "not-played";

export type GroupFormMatch = MatchSlotOccupants & {
  status: string | null;
  /** When the Match is played; null when it was never scheduled. */
  startTime: Date | null;
  /** Falls in for a Match with no start time, and breaks ties. */
  createdAt: Date;
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

function playedAt(match: GroupFormMatch): Date {
  return match.startTime ?? match.createdAt;
}

function markFor(match: GroupFormMatch, slot: 1 | 2): FormMark {
  if (match.status !== MatchStatusEnum.COMPLETED) {
    return "not-played";
  }
  const outcome = outcomeForSlot(slot, matchOutcome(match.sets).result);
  if (outcome === "won" || outcome === "lost") {
    return outcome;
  }
  return "not-played";
}

/** The member's last five results in this Group, oldest first, newest last. */
export function groupFormMarks(
  matches: readonly GroupFormMatch[],
  userId: string,
  now: Date,
): FormMark[] {
  const played: { match: GroupFormMatch; slot: 1 | 2 }[] = [];
  for (const match of matches) {
    if (match.status === MatchStatusEnum.CANCELLED) {
      continue;
    }
    const slot = seatedUserSlotOnMatch(match, userId);
    if (slot == null) {
      continue;
    }
    if (
      match.status !== MatchStatusEnum.COMPLETED &&
      playedAt(match).getTime() > now.getTime()
    ) {
      continue;
    }
    played.push({ match, slot });
  }

  played.sort((left, right) => {
    const byPlayedAt =
      playedAt(left.match).getTime() - playedAt(right.match).getTime();
    if (byPlayedAt !== 0) {
      return byPlayedAt;
    }
    return left.match.createdAt.getTime() - right.match.createdAt.getTime();
  });

  return played
    .slice(-GROUP_FORM_MARK_LIMIT)
    .map((entry) => markFor(entry.match, entry.slot));
}
