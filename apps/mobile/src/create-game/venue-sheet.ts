function searchSheetLabel(query: string, count: number, everything: string) {
  if (!query.trim()) {
    return everything;
  }
  return count === 1 ? "1 RESULT" : `${count} RESULTS`;
}

export function venueSheetLabel(query: string, count: number) {
  return searchSheetLabel(query, count, "ALL VENUES");
}

export function groupSheetLabel(query: string, count: number) {
  return searchSheetLabel(query, count, "ALL GROUPS");
}

export function labelMatchesQuery(label: string, query: string) {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}
