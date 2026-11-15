"use client";

import { use } from "react";

import { BookingsList } from "~/components/bookings/bookings-list";
import { ConsolePage } from "~/components/console/console-page";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { PageHeader } from "~/components/console/page-header";
import { useMessages } from "~/components/locale-provider";

export default function BookingsPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);
  const venue = useManagedVenue();
  const m = useMessages().consoleBookings;

  return (
    <ConsolePage>
      <PageHeader title={m.pageTitle} description={m.pageDescription} />
      <BookingsList venueId={venueId} courts={venue.courts} />
    </ConsolePage>
  );
}
