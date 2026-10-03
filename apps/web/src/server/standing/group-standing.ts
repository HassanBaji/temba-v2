import { MatchStatusEnum } from "@repo/db/schema";

import { setWinsForGames } from "~/server/games/set-wins-for-games";
import {
  seatedUserSlotOnMatch,
  type MatchSlotOccupants,
} from "~/server/games/match-slots";

export type GroupStandingMatch = MatchSlotOccupants & {
  gameId: string;
  status: string | null;
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

export type MemberStandingRecord = {
  totalSetsWon: number;
  totalPointsWon: number;
  totalGamesPlayed: number;
};

/**
 * Standing record per Group member, derived from the Matches of the Group's
 * Games (cancelled Games already dropped). Only a completed Match counts; a
 * Walkover is a cancelled Match, so it counts for nothing. Every requested
 * member id is present, at zero when they have no results.
 */
export function groupMemberStandingRecords(
  matches: readonly GroupStandingMatch[],
  memberUserIds: readonly string[],
): Map<string, MemberStandingRecord> {
  const records = new Map<string, MemberStandingRecord>();
  const gamesPlayed = new Map<string, Set<string>>();
  for (const userId of memberUserIds) {
    records.set(userId, {
      totalSetsWon: 0,
      totalPointsWon: 0,
      totalGamesPlayed: 0,
    });
    gamesPlayed.set(userId, new Set());
  }

  for (const match of matches) {
    if (match.status !== MatchStatusEnum.COMPLETED) {
      continue;
    }
    for (const [userId, record] of records) {
      const slot = seatedUserSlotOnMatch(match, userId);
      if (slot == null) {
        continue;
      }
      gamesPlayed.get(userId)?.add(match.gameId);
      for (const set of match.sets) {
        const wins = setWinsForGames(set.slot1GamesWon, set.slot2GamesWon);
        if (!wins) {
          continue;
        }
        if (slot === 1) {
          record.totalSetsWon += wins.slot1SetWins;
          record.totalPointsWon += set.slot1GamesWon ?? 0;
        } else {
          record.totalSetsWon += wins.slot2SetWins;
          record.totalPointsWon += set.slot2GamesWon ?? 0;
        }
      }
    }
  }

  for (const [userId, record] of records) {
    record.totalGamesPlayed = gamesPlayed.get(userId)?.size ?? 0;
  }
  return records;
}

export function hasStandingResults(record: MemberStandingRecord): boolean {
  return (
    record.totalSetsWon > 0 ||
    record.totalPointsWon > 0 ||
    record.totalGamesPlayed > 0
  );
}
