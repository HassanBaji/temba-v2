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

export function filterVenuesForSelect(
  venues: VenueSelectOption[],
  query: string,
  selectedLabel?: string,
): VenueSelectOption[] {
  const trimmed = query.trim();
  if (
    trimmed === "" ||
    (selectedLabel !== undefined && trimmed === selectedLabel)
  ) {
    return venues;
  }

  const needle = trimmed.toLowerCase();
  return venues.filter((venue) =>
    venueOptionLabel(venue).toLowerCase().includes(needle),
  );
}

export function venueMatchingQuery(
  venues: VenueSelectOption[],
  query: string,
): VenueSelectOption | undefined {
  const trimmed = query.trim();
  if (trimmed === "") {
    return undefined;
  }

  const needle = trimmed.toLowerCase();
  const exact = venues.find(
    (venue) => venueOptionLabel(venue).toLowerCase() === needle,
  );
  if (exact) {
    return exact;
  }

  const filtered = filterVenuesForSelect(venues, query);
  return filtered.length === 1 ? filtered[0] : undefined;
}
