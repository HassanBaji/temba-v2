export function activeVenueCountLabel(
  venues: { archivedAt: Date | string | null }[],
): string | null {
  const count = venues.filter((venue) => venue.archivedAt == null).length;
  if (count === 0) {
    return null;
  }
  return count === 1 ? "1 venue" : `${count} venues`;
}
