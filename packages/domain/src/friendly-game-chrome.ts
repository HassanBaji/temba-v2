import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatAbsoluteDay } from "./format-game-start";
import { withGoogleLocale } from "./google-locale";
import { parseOptionalCoord } from "./parse-optional-coord";
import { formatPricePerPlayerFils } from "./price-per-player";
import type { GameViewerStatus } from "./game-summary-cta";

export function friendlyGameHomeTitle(
  groupId: string | null | undefined,
  groupName: string | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale).game.chrome;
  if (!groupId) {
    return m.pickup;
  }
  const name = groupName?.trim();
  return name && name.length > 0 ? name : m.group;
}

export function friendlyGameViewerLine(
  status: GameViewerStatus,
  locale: Locale,
) {
  const m = messagesFor(locale).game.chrome;
  if (status === "in") {
    return m.yourePlaying;
  }
  if (status === "waitlisted") {
    return m.youreOnTheWaitlist;
  }
  return null;
}

export function friendlyGamePriceRow(
  fils: number | null | undefined,
  locale: Locale,
) {
  const amount = formatPricePerPlayerFils(fils, locale);
  if (amount == null) {
    return null;
  }
  return {
    amount,
    helper:
      fils != null && fils > 0
        ? messagesFor(locale).game.chrome.paidAtTheVenue
        : null,
  };
}

export function friendlyGameOccupancyLabel(
  registeredUserCount: number,
  playersAllowed: number | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale).game.chrome;
  if (playersAllowed == null) {
    return m.players(registeredUserCount);
  }
  return m.playersOf(registeredUserCount, playersAllowed);
}

export function friendlyGameOpenSpotsLabel(
  registeredUserCount: number,
  playersAllowed: number | null | undefined,
  locale: Locale,
) {
  if (playersAllowed == null) {
    return null;
  }

  const openSpots = playersAllowed - registeredUserCount;
  return messagesFor(locale).game.occupancy.spotsLeft(openSpots);
}

export function friendlyGameDirectionsUrl(
  latitude: string | null | undefined,
  longitude: string | null | undefined,
  locale: Locale,
) {
  if (latitude == null || longitude == null) {
    return null;
  }
  const lat = parseOptionalCoord(latitude);
  const lng = parseOptionalCoord(longitude);
  if (lat == null || lng == null) {
    return null;
  }
  return withGoogleLocale(
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    locale,
  );
}

/** The pin when the Venue has one, otherwise a search for its name and city. */
export function friendlyGameVenueDirectionsUrl(
  venue: {
    name: string;
    city: string | null;
    latitude: string | null | undefined;
    longitude: string | null | undefined;
  },
  locale: Locale,
) {
  const pinned = friendlyGameDirectionsUrl(
    venue.latitude,
    venue.longitude,
    locale,
  );
  if (pinned) {
    return pinned;
  }
  const query = [venue.name, venue.city].filter(Boolean).join(", ");
  return withGoogleLocale(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    locale,
  );
}

export function friendlyGameDateDurationLine(
  windowStart: Date | string | null | undefined,
  durationInMinutes: number | null | undefined,
  locale: Locale,
) {
  if (!windowStart) {
    return null;
  }
  const date = formatAbsoluteDay(windowStart, locale);
  if (durationInMinutes == null) {
    return date;
  }
  return messagesFor(locale).game.chrome.dateDuration(date, durationInMinutes);
}
