"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import Link from "next/link";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { DashboardShell } from "~/components/dashboard-shell";
import { NoManagedVenues } from "~/components/manage/no-managed-venues";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";

export default function ManagePage() {
  const router = useRouter();
  const venues = api.venues.listManaged.useQuery();
  const onlyVenueId =
    venues.data?.length === 1 ? venues.data[0]?.id : undefined;

  React.useEffect(() => {
    if (onlyVenueId) {
      router.replace(`/dashboard/manage/${onlyVenueId}`);
    }
  }, [onlyVenueId, router]);

  return (
    <DashboardShell
      title="Manage"
      description="Venues you run: Bookings, Customers, settings and reports."
    >
      {venues.isLoading || onlyVenueId ? <ListPageSkeleton rows={3} /> : null}

      {venues.error ? (
        <ErrorState
          title="Venues could not be loaded"
          message={venues.error.message}
          onRetry={() => {
            void venues.refetch();
          }}
        />
      ) : null}

      {venues.data?.length === 0 ? <NoManagedVenues /> : null}

      {venues.data && venues.data.length > 1 ? (
        <RowList>
          {venues.data.map((venue) => (
            <ListRow
              key={venue.id}
              asChild
              leading={
                <EntityMonogram
                  name={venue.name}
                  image={venue.logoImageUrl}
                  size="lg"
                />
              }
              title={venue.name}
              meta={`${venue.city} · ${venue.courtCount} ${
                venue.courtCount === 1 ? "Court" : "Courts"
              } · ${venue.upcomingBookingCount} upcoming · ${venue.unsettledCount} unsettled`}
              trailing={
                venue.acceptingBookings ? (
                  <Badge variant="secondary">Accepting bookings</Badge>
                ) : venue.archivedAt ? (
                  <Badge variant="outline">Soft-archived</Badge>
                ) : undefined
              }
            >
              <Link href={`/dashboard/manage/${venue.id}`} />
            </ListRow>
          ))}
        </RowList>
      ) : null}
    </DashboardShell>
  );
}
