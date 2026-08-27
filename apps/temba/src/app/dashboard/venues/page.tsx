"use client";

import Link from "next/link";

import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function VenuesPage() {
  const venues = api.venues.list.useQuery();

  return (
    <DashboardShell title="Venues">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              Venues
            </h2>
            <p className="text-muted-foreground text-sm">
              Physical sites in the catalog. Create a Venue before any Community
              claims it.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/venues/new">Create Venue</Link>
          </Button>
        </div>

        {venues.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {venues.error ? (
          <p className="text-destructive text-sm">{venues.error.message}</p>
        ) : null}

        {venues.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No Venues yet. Create one to start the catalog.
          </p>
        ) : null}

        {venues.data && venues.data.length > 0 ? (
          <ul className="divide-border border-border bg-card divide-y rounded-xl border">
            {venues.data.map((venue) => (
              <li key={venue.id}>
                <Link
                  href={`/dashboard/venues/${venue.id}`}
                  className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">{venue.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {venue.city}, {venue.country}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </DashboardShell>
  );
}
