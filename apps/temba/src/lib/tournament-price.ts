export function viewerTournamentTotalCents(
  pricePerPlayerCents: number | null | undefined,
  matchesForViewerPool: number,
): number | null {
  if (pricePerPlayerCents == null) {
    return null;
  }
  if (!Number.isInteger(matchesForViewerPool) || matchesForViewerPool < 0) {
    return null;
  }
  return pricePerPlayerCents * matchesForViewerPool;
}
