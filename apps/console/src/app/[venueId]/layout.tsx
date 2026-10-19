"use client";

import { notFound } from "next/navigation";
import { use, type ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { ConsolePage } from "~/components/console/console-page";
import { ConsoleShell } from "~/components/console/console-shell";
import { ManagedVenueProvider } from "~/components/console/managed-venue-context";
import { NoManagedVenues } from "~/components/console/no-managed-venues";
import { api } from "~/trpc/react";
import { isNotFoundError } from "@repo/domain/is-not-found-error";

const webOrigin = process.env.NEXT_PUBLIC_WEB_ORIGIN;

export default function VenueLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);
  const venue = api.venues.managedById.useQuery({ venueId });

  if (isNotFoundError(venue.error)) {
    notFound();
  }

  if (venue.isLoading) {
    return (
      <ConsoleShell webOrigin={webOrigin}>
        <ConsolePage>
          <DetailPageSkeleton />
        </ConsolePage>
      </ConsoleShell>
    );
  }

  if (venue.error?.data?.code === "FORBIDDEN") {
    return (
      <ConsoleShell webOrigin={webOrigin}>
        <ConsolePage>
          <NoManagedVenues webOrigin={webOrigin} />
        </ConsolePage>
      </ConsoleShell>
    );
  }

  if (venue.error || !venue.data) {
    return (
      <ConsoleShell webOrigin={webOrigin}>
        <ConsolePage>
          <ErrorState
            title="Venue could not be loaded"
            message={venue.error?.message}
            onRetry={() => {
              void venue.refetch();
            }}
          />
        </ConsolePage>
      </ConsoleShell>
    );
  }

  const data = venue.data;

  return (
    <ConsoleShell
      webOrigin={webOrigin}
      venue={{
        id: data.id,
        name: data.name,
        city: data.city,
        courtCount: data.courts.length,
      }}
    >
      <ManagedVenueProvider venue={data}>{children}</ManagedVenueProvider>
    </ConsoleShell>
  );
}
