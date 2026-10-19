"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { BookingDetails } from "~/components/bookings/booking-details";

export default function ManageBookingPage({
  params,
}: {
  params: Promise<{ venueId: string; bookingId: string }>;
}) {
  const { venueId, bookingId } = use(params);

  return (
    <div className="space-y-4">
      <Link
        href={`/dashboard/manage/${venueId}/bookings`}
        className="text-body inline-flex items-center gap-1 underline-offset-4 hover:underline"
      >
        <ChevronLeft className="size-4" />
        Bookings
      </Link>
      <BookingDetails bookingId={bookingId} />
    </div>
  );
}
