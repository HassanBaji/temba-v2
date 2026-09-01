export function setWinsForGames(
  slot1GamesWon: number | null,
  slot2GamesWon: number | null,
): { slot1SetWins: number; slot2SetWins: number } | null {
  if (slot1GamesWon == null || slot2GamesWon == null) {
    return null;
  }
  if (slot1GamesWon === slot2GamesWon) {
    return { slot1SetWins: 0, slot2SetWins: 0 };
  }
  if (slot1GamesWon > slot2GamesWon) {
    return { slot1SetWins: 1, slot2SetWins: 0 };
  }
  return { slot1SetWins: 0, slot2SetWins: 1 };
}
