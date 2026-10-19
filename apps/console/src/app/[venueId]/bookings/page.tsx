"use client";

import { use } from "react";

import { BookingsList } from "~/components/bookings/bookings-list";
import { ConsolePage } from "~/components/console/console-page";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { PageHeader } from "~/components/console/page-header";

export default function BookingsPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);
  const venue = useManagedVenue();

  return (
    <ConsolePage>
      <PageHeader
        title="Bookings"
        description="Everything on the books, app and manual."
      />
      <BookingsList venueId={venueId} courts={venue.courts} />
    </ConsolePage>
  );
}
