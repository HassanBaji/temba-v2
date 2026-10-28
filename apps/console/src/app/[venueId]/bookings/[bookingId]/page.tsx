"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { BookingDetails } from "~/components/bookings/booking-details";
import { ConsolePage } from "~/components/console/console-page";
import { venuePath } from "~/lib/console-paths";

export default function BookingPage({
  params,
}: {
  params: Promise<{ venueId: string; bookingId: string }>;
}) {
  const { venueId, bookingId } = use(params);

  return (
    <ConsolePage className="gap-4">
      <Link
        href={venuePath(venueId, "bookings")}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1.5 rounded-sm text-[13px] outline-none transition-colors focus-visible:ring-[3px]"
      >
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Bookings
      </Link>
      <BookingDetails bookingId={bookingId} />
    </ConsolePage>
  );
}
