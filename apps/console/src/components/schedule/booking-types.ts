import type { RouterOutputs } from "~/trpc/react";

export type VenueBookings = RouterOutputs["bookings"]["listForVenue"];
export type VenueBooking = VenueBookings["bookings"][number];
export type BookingView = RouterOutputs["bookings"]["byId"];

export function holderName(holder: VenueBooking["holder"]): string {
  return holder.name || (holder.kind === "guest" ? holder.phone : "Customer");
}
