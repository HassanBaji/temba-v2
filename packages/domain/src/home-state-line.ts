import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/** One line of Home header state. Prefers invites; otherwise booked games. */
export function homeStateLine(
  pendingInviteCount: number,
  bookedGameCount: number,
  locale: Locale,
): string | null {
  const m = messagesFor(locale).home.stateLine;
  if (pendingInviteCount > 0) {
    return m.invitesWaiting(pendingInviteCount);
  }
  if (bookedGameCount > 0) {
    return m.gamesBooked(bookedGameCount);
  }
  return null;
}
