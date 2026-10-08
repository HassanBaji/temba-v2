/**
 * Win streak: consecutive won Matches in time order. A loss or a draw ends
 * it. Both functions read Matches newest first.
 */
export type WinStreakMatch = { won: boolean; playedAt: Date };

export type BestWinStreak = { count: number; reachedAt: Date | null };

/** The Win streak that ends at the newest Match. */
export function currentWinStreak(newestFirst: readonly WinStreakMatch[]) {
  let count = 0;
  for (const match of newestFirst) {
    if (!match.won) {
      break;
    }
    count += 1;
  }
  return count;
}

/**
 * The longest Win streak, and when the Match that completed it was played.
 * Of two equally long streaks the more recent one wins.
 */
export function bestWinStreak(
  newestFirst: readonly WinStreakMatch[],
): BestWinStreak {
  let best: BestWinStreak = { count: 0, reachedAt: null };
  let count = 0;
  let completedAt: Date | null = null;
  for (const match of newestFirst) {
    if (!match.won) {
      count = 0;
      continue;
    }
    if (count === 0) {
      completedAt = match.playedAt;
    }
    count += 1;
    if (count > best.count) {
      best = { count, reachedAt: completedAt };
    }
  }
  return best;
}
