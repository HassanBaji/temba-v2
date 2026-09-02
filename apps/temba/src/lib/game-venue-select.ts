export type VenueSelectOption = {
  id: string;
  name: string;
  city: string;
  country: string;
};

export function venueOptionLabel(venue: {
  name: string;
  city: string;
  country: string;
}) {
  return `${venue.name} — ${venue.city}, ${venue.country}`;
}

export function filterVenuesForSelect<T extends VenueSelectOption>(
  venues: T[],
  query: string,
  options: { selectedLabel?: string } = {},
): T[] {
  const trimmed = query.trim();
  if (
    trimmed === "" ||
    (options.selectedLabel !== undefined && trimmed === options.selectedLabel)
  ) {
    return venues;
  }

  const needle = trimmed.toLowerCase();
  return venues.filter((venue) =>
    venueOptionLabel(venue).toLowerCase().includes(needle),
  );
}
