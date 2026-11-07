import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export function activeVenueCountLabel(
  venues: { archivedAt: Date | string | null }[],
  locale: Locale,
): string | null {
  const count = venues.filter((venue) => venue.archivedAt == null).length;
  if (count === 0) {
    return null;
  }
  return messagesFor(locale).webDashboard.venues.liveCount(count);
}
