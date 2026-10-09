/**
 * Standing order within a Group (leaderboard):
 * sets won → points won → Games played → name.
 */

export type StandingMember = {
  userId: string;
  totalSetsWon: number;
  totalPointsWon: number;
  totalGamesPlayed: number;
  name: string;
};

export function compareStanding(a: StandingMember, b: StandingMember): number {
  if (b.totalSetsWon !== a.totalSetsWon) {
    return b.totalSetsWon - a.totalSetsWon;
  }
  if (b.totalPointsWon !== a.totalPointsWon) {
    return b.totalPointsWon - a.totalPointsWon;
  }
  if (b.totalGamesPlayed !== a.totalGamesPlayed) {
    return b.totalGamesPlayed - a.totalGamesPlayed;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function sortStandingMembers<T extends StandingMember>(
  members: T[],
): T[] {
  return [...members].sort(compareStanding);
}

/** 1-based position among Group members, or null if the user is not listed. */
export function standingPosition(
  sortedMembers: StandingMember[],
  userId: string,
): number | null {
  const index = sortedMembers.findIndex((member) => member.userId === userId);
  return index === -1 ? null : index + 1;
}
