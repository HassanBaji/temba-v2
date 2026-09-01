import { setWinsForGames } from "~/server/games/set-wins-for-games";

export function matchOutcome(
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[],
): {
  slot1SetWins: number;
  slot2SetWins: number;
  result: "slot1" | "slot2" | "draw" | "none";
} {
  let slot1SetWins = 0;
  let slot2SetWins = 0;
  let scored = 0;
  for (const set of sets) {
    const wins = setWinsForGames(set.slot1GamesWon, set.slot2GamesWon);
    if (!wins) {
      continue;
    }
    scored += 1;
    slot1SetWins += wins.slot1SetWins;
    slot2SetWins += wins.slot2SetWins;
  }
  if (scored === 0) {
    return { slot1SetWins, slot2SetWins, result: "none" };
  }
  if (slot1SetWins === slot2SetWins) {
    return { slot1SetWins, slot2SetWins, result: "draw" };
  }
  return {
    slot1SetWins,
    slot2SetWins,
    result: slot1SetWins > slot2SetWins ? "slot1" : "slot2",
  };
}
