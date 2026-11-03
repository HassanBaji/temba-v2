import { courtCountLabel as courtCountLabelFor } from "@repo/domain/court-sport-copy";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { OpeningWindow } from "./slot-grid";

export type VenueSort = "name" | "cheapest";

export function venueSorts(
  locale: Locale,
): { key: VenueSort; label: string }[] {
  const m = messagesFor(locale).mobileBooking.sort;
  return [
    { key: "name", label: m.aToZ },
    { key: "cheapest", label: m.cheapest },
  ];
}

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
export function minutesLabel(minutes: number, locale: Locale): string {
  const m = messagesFor(locale).mobileBooking;
  const ofDay = ((minutes % 1440) + 1440) % 1440;
  if (ofDay === 0) {
    return m.midnight;
  }
  const hour = Math.floor(ofDay / 60);
  const minute = ofDay % 60;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? m.am : m.pm;
  return m.wallClock(
    minute === 0
      ? String(hour12)
      : `${hour12}:${String(minute).padStart(2, "0")}`,
    suffix,
  );
}

export function hoursLabel(
  windows: readonly OpeningWindow[],
  locale: Locale,
): string {
  const m = messagesFor(locale).mobileBooking;
  if (windows.length === 0) {
    return m.closed;
  }
  return windows
    .map((window) =>
      m.hoursWindow(
        minutesLabel(window.opensAtMinutes, locale),
        minutesLabel(window.closesAtMinutes, locale),
      ),
    )
    .join(m.hoursSeparator);
}

/** "Open to 11 PM" from the day's last window, or "Closed today". */
export function openToLabel(
  windows: readonly OpeningWindow[],
  locale: Locale,
): string {
  const m = messagesFor(locale).mobileBooking;
  const closes = Math.max(...windows.map((window) => window.closesAtMinutes));
  return windows.length === 0
    ? m.closedToday
    : m.openTo(minutesLabel(closes, locale));
}

export function courtCountLabel(
  count: number,
  locale: Locale,
  sport: Sport = DEFAULT_SPORT,
): string {
  return courtCountLabelFor(count, sport, locale);
}

export function venuesEmptyCopy(
  query: string,
  locale: Locale,
  sport: Sport = DEFAULT_SPORT,
): {
  title: string;
  description: string;
} {
  const m = messagesFor(locale).mobileBooking.venuesEmpty;
  return query.trim()
    ? m.noMatch
    : sport === "football"
      ? m.noPitches
      : m.noVenues;
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
