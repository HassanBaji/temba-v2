import type { RouterOutputs } from "~/trpc/react";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type VenueBookings = RouterOutputs["bookings"]["listForVenue"];
export type VenueBooking = VenueBookings["bookings"][number];
export type BookingView = RouterOutputs["bookings"]["byId"];

export function holderName(
  holder: VenueBooking["holder"],
  locale: Locale,
): string {
  return (
    holder.name ||
    (holder.kind === "guest"
      ? holder.phone
      : messagesFor(locale).consoleBookings.customerFallback)
  );
}
