import { formatAbsoluteDay, formatGameClock } from "~/lib/format-game-start";
import { parseOptionalCoord } from "~/lib/parse-optional-coord";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import type { GameViewerStatus } from "~/lib/game-summary-cta";

export function friendlyGameHomeTitle(
  groupId: string | null | undefined,
  groupName: string | null | undefined,
) {
  if (!groupId) {
    return "Pickup";
  }
  const name = groupName?.trim();
  return name && name.length > 0 ? name : "Group";
}

export function friendlyGameViewerLine(status: GameViewerStatus) {
  if (status === "in") {
    return "You're playing";
  }
  if (status === "waitlisted") {
    return "You're on the waitlist";
  }
  return null;
}

export function friendlyGamePriceRow(cents: number | null | undefined) {
  const amount = formatPricePerPlayerCents(cents);
  if (amount == null) {
    return null;
  }
  return {
    amount,
    helper: cents != null && cents > 0 ? "Paid at the venue" : null,
  };
}

export function friendlyGameOccupancyLabel(
  registeredUserCount: number,
  playersAllowed: number | null | undefined,
) {
  if (playersAllowed == null) {
    return registeredUserCount === 1
      ? "1 player"
      : `${registeredUserCount} players`;
  }
  return `${registeredUserCount} of ${playersAllowed} players`;
}

export function friendlyGameDirectionsUrl(
  latitude: string | null | undefined,
  longitude: string | null | undefined,
) {
  if (latitude == null || longitude == null) {
    return null;
  }
  const lat = parseOptionalCoord(latitude);
  const lng = parseOptionalCoord(longitude);
  if (lat == null || lng == null) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function friendlyGameVenueLine(
  venueName: string | null | undefined,
  courtName: string | null | undefined,
) {
  if (venueName && courtName) {
    return `${venueName} · ${courtName}`;
  }
  return venueName ?? courtName ?? null;
}

export function friendlyGameDateDurationLine(
  windowStart: Date | string | null | undefined,
  durationInMinutes: number | null | undefined,
) {
  if (!windowStart) {
    return null;
  }
  const date = formatAbsoluteDay(windowStart);
  if (durationInMinutes == null) {
    return date;
  }
  return `${date} · ${durationInMinutes} min`;
}

export function friendlyGameDateTimeLine(
  windowStart: Date | string | null | undefined,
) {
  if (!windowStart) {
    return null;
  }
  return `${formatAbsoluteDay(windowStart)} · ${formatGameClock(windowStart)}`;
}
