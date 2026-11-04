export function winRatePercent(won: number, played: number): number | null {
  if (played <= 0) {
    return null;
  }
  return Math.round((100 * won) / played);
}

/** Below this many Matches a win rate says more about luck than form. */
export const WIN_RATE_MIN_MATCHES = 5;

/** The win rate, or null until the User has played enough Matches to show it. */
export function shownWinRatePercent(won: number, played: number) {
  return played < WIN_RATE_MIN_MATCHES ? null : winRatePercent(won, played);
}

export function formatWinRate(won: number, played: number): string {
  const percent = winRatePercent(won, played);
  return percent === null ? "—" : `${percent}%`;
}
