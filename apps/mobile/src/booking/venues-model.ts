import { courtCountLabel as courtCountLabelFor } from "@repo/domain/court-sport-copy";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";

import type { OpeningWindow } from "./slot-grid";

export type VenueSort = "name" | "cheapest";

export const VENUE_SORTS: { key: VenueSort; label: string }[] = [
  { key: "name", label: "A to Z" },
  { key: "cheapest", label: "Cheapest" },
];

type ListedVenue = {
  name: string;
  city: string;
  fromHourlyRateFils: number;
};

export function filterVenues<T extends ListedVenue>(
  venues: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...venues];
  }
  return venues.filter(
    (venue) =>
      venue.name.toLowerCase().includes(needle) ||
      venue.city.toLowerCase().includes(needle),
  );
}

export function sortVenues<T extends ListedVenue>(
  venues: readonly T[],
  sort: VenueSort,
): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  return [...venues].sort(
    sort === "cheapest"
      ? (a, b) => a.fromHourlyRateFils - b.fromHourlyRateFils || byName(a, b)
      : byName,
  );
}

/** Minutes after the Venue's midnight as a wall clock: "6 AM", "11:30 PM", "1 AM". */
export function minutesLabel(minutes: number): string {
  const ofDay = ((minutes % 1440) + 1440) % 1440;
  if (ofDay === 0) {
    return "Midnight";
  }
  const hour = Math.floor(ofDay / 60);
  const minute = ofDay % 60;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return minute === 0
    ? `${hour12} ${suffix}`
    : `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function hoursLabel(windows: readonly OpeningWindow[]): string {
  if (windows.length === 0) {
    return "Closed";
  }
  return windows
    .map(
      (window) =>
        `${minutesLabel(window.opensAtMinutes)} to ${minutesLabel(window.closesAtMinutes)}`,
    )
    .join(", ");
}

/** "Open to 11 PM" from the day's last window, or "Closed today". */
export function openToLabel(windows: readonly OpeningWindow[]): string {
  const closes = Math.max(...windows.map((window) => window.closesAtMinutes));
  return windows.length === 0
    ? "Closed today"
    : `Open to ${minutesLabel(closes)}`;
}

export function courtCountLabel(
  count: number,
  sport: Sport = DEFAULT_SPORT,
): string {
  return courtCountLabelFor(count, sport);
}

export function venuesEmptyCopy(
  query: string,
  sport: Sport = DEFAULT_SPORT,
): {
  title: string;
  description: string;
} {
  return query.trim()
    ? {
        title: "No venue matches",
        description: "Try another area or venue name.",
      }
    : sport === "football"
      ? {
          title: "No pitches to book yet",
          description: "Venues with pitches show here once they open bookings.",
        }
      : {
          title: "No venues to book yet",
          description: "Venues show here once they open bookings on Temba.",
        };
}

/**
 * The venue list is at least as tall as the space left under the pinned
 * filter bar, so the bar can always scroll up to the top, however few
 * venues match.
 */
export function venueListMinHeight({
  viewportHeight,
  filterBarHeight,
  gap,
  paddingBottom,
}: {
  viewportHeight: number;
  filterBarHeight: number;
  gap: number;
  paddingBottom: number;
}): number {
  return Math.max(0, viewportHeight - filterBarHeight - gap - paddingBottom);
}
