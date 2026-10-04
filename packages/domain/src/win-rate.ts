export function winRatePercent(won: number, played: number): number | null {
  if (played <= 0) {
    return null;
  }
  return Math.round((100 * won) / played);
}

export function formatWinRate(won: number, played: number): string {
  const percent = winRatePercent(won, played);
  return percent === null ? "—" : `${percent}%`;
}
