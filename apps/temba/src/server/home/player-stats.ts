/**
 * Home player stats from completed Matches the User sat on:
 * Games played / Games won are completed Matches; Sets won are Set-wins
 * on those Matches. Cancelled Games do not count. Draws are played, not won.
 */

import { matchOutcome } from "~/server/games/sets";

export type PlayerStatSet = {
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

export type PlayerStatMatch = {
  userSlot: 1 | 2;
  sets: readonly PlayerStatSet[];
};

export type PlayerStats = {
  gamesPlayed: number;
  gamesWon: number;
  setsWon: number;
};

export const EMPTY_PLAYER_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  setsWon: 0,
};

export function userSlotOnMatch(
  match: {
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
  },
  myGameTeamIds: ReadonlySet<string>,
): 1 | 2 | null {
  const onSlot1 =
    match.slot1GameTeamId != null && myGameTeamIds.has(match.slot1GameTeamId);
  const onSlot2 =
    match.slot2GameTeamId != null && myGameTeamIds.has(match.slot2GameTeamId);
  if (onSlot1 === onSlot2) {
    return null;
  }
  return onSlot1 ? 1 : 2;
}

export function summarizePlayerStats(
  matches: readonly PlayerStatMatch[],
): PlayerStats {
  let gamesWon = 0;
  let setsWon = 0;
  for (const match of matches) {
    const outcome = matchOutcome(match.sets);
    if (match.userSlot === 1) {
      setsWon += outcome.slot1SetWins;
      if (outcome.result === "slot1") {
        gamesWon += 1;
      }
    } else {
      setsWon += outcome.slot2SetWins;
      if (outcome.result === "slot2") {
        gamesWon += 1;
      }
    }
  }
  return {
    gamesPlayed: matches.length,
    gamesWon,
    setsWon,
  };
}

export function playerStatsFromCompletedMatches(
  matches: readonly {
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
    gameCancelled: boolean;
    sets: readonly PlayerStatSet[];
  }[],
  myGameTeamIds: ReadonlySet<string>,
): PlayerStats {
  const played: PlayerStatMatch[] = [];
  for (const match of matches) {
    if (match.gameCancelled) {
      continue;
    }
    const userSlot = userSlotOnMatch(match, myGameTeamIds);
    if (userSlot == null) {
      continue;
    }
    played.push({ userSlot, sets: match.sets });
  }
  return summarizePlayerStats(played);
}
