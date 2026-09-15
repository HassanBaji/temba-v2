/**
 * W-L per Group member, derived from the Group's Matches on every request.
 * There are no `group_members` win/loss counters and none are added — a
 * second write path could drift from the standing counters
 * (`.scratch/groups-redesign/spec.md` D2).
 *
 * Feed it the Matches of the Group's Games, cancelled Games already dropped.
 *
 * Only a completed Match carries a result: a Match still awaiting result
 * confirmation stays pending and counts as neither a win nor a loss
 * (ADR-0011). A draw is played, not won, so it counts as neither either.
 */

import { MatchStatusEnum } from "@repo/db/schema";

import { matchOutcome } from "~/server/games/match-outcome";
import {
  outcomeForSlot,
  seatedUserSlotOnMatch,
  type MatchSlotOccupants,
} from "~/server/games/match-slots";

export type GroupWinLossMatch = MatchSlotOccupants & {
  status: string | null;
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

export type MemberWinLoss = {
  wins: number;
  losses: number;
};

/**
 * Wins and losses per member across the Matches of one Group's Games. Every
 * requested member id is present, at `0-0` when they have no results.
 */
export function groupMemberWinLoss(
  matches: readonly GroupWinLossMatch[],
  memberUserIds: readonly string[],
): Map<string, MemberWinLoss> {
  const records = new Map<string, MemberWinLoss>();
  for (const userId of memberUserIds) {
    records.set(userId, { wins: 0, losses: 0 });
  }

  for (const match of matches) {
    if (match.status !== MatchStatusEnum.COMPLETED) {
      continue;
    }
    const { result } = matchOutcome(match.sets);
    for (const [userId, record] of records) {
      const slot = seatedUserSlotOnMatch(match, userId);
      if (slot == null) {
        continue;
      }
      const outcome = outcomeForSlot(slot, result);
      if (outcome === "won") {
        record.wins += 1;
      } else if (outcome === "lost") {
        record.losses += 1;
      }
    }
  }

  return records;
}
