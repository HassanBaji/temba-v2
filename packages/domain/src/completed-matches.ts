import { matchOutcome } from "./match-outcome";

export type MatchSetScore = {
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

export type CompletedMatchSlotPlayer = {
  userId: string;
  name: string;
};

/**
 * Completed Matches the User sat on via a Game team slot. Cancelled Games are
 * omitted. Drawn Matches stay in the list: they are played, not won or lost.
 */
export type CompletedMatchForStats = {
  matchId: string;
  createdAt: Date;
  displayTime: Date;
  userSlot: 1 | 2;
  sets: readonly MatchSetScore[];
  slot1Players: readonly CompletedMatchSlotPlayer[];
  slot2Players: readonly CompletedMatchSlotPlayer[];
};

export type CompletedMatchStats = {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
};

export function summarizeCompletedMatchStats(
  played: readonly Pick<CompletedMatchForStats, "userSlot" | "sets">[],
): CompletedMatchStats {
  let gamesWon = 0;
  let gamesLost = 0;
  let setsWon = 0;
  let setsLost = 0;
  for (const match of played) {
    const outcome = matchOutcome(match.sets);
    const won =
      match.userSlot === 1
        ? outcome.result === "slot1"
        : outcome.result === "slot2";
    const lost =
      match.userSlot === 1
        ? outcome.result === "slot2"
        : outcome.result === "slot1";
    if (match.userSlot === 1) {
      setsWon += outcome.slot1SetWins;
      setsLost += outcome.slot2SetWins;
    } else {
      setsWon += outcome.slot2SetWins;
      setsLost += outcome.slot1SetWins;
    }
    if (won) {
      gamesWon += 1;
    }
    if (lost) {
      gamesLost += 1;
    }
  }
  return {
    gamesPlayed: played.length,
    gamesWon,
    gamesLost,
    setsWon,
    setsLost,
  };
}
