"use client";

import Link from "next/link";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function VenuesPage() {
  const utils = api.useUtils();
  const venues = api.venues.list.useQuery();
  const pendingLinks = api.venues.listPendingLinkRequests.useQuery();

  const approveLink = api.venues.approveLinkRequest.useMutation({
    onSuccess: async () => {
      toast.success("Venue link approved");
      await utils.venues.listPendingLinkRequests.invalidate();
      await utils.venues.list.invalidate();
      await utils.venues.byId.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectLink = api.venues.rejectLinkRequest.useMutation({
    onSuccess: async () => {
      toast.success("Venue link request rejected");
      await utils.venues.listPendingLinkRequests.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <DashboardShell title="Venues">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              Venues
            </h2>
            <p className="text-muted-foreground text-sm">
              Physical sites in the catalog, including Soft-archived Venues.
              Create a Venue before any Community claims it.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/venues/new">Create Venue</Link>
          </Button>
        </div>

        <section className="border-border bg-card space-y-4 rounded-xl border p-6">
          <div>
            <h3 className="text-foreground text-lg font-medium">
              Pending Venue link requests
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Approve sets the Community live Venue pointer. Reject is silent
              and does not admit Users.
            </p>
          </div>

          {pendingLinks.isLoading ? <Skeleton className="h-16 w-full" /> : null}
          {pendingLinks.error ? (
            <p className="text-destructive text-sm">
              {pendingLinks.error.message}
            </p>
          ) : null}
          {pendingLinks.data?.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No pending Venue link requests.
            </p>
          ) : null}
          {pendingLinks.data && pendingLinks.data.length > 0 ? (
            <ul className="divide-border border-border divide-y rounded-lg border">
              {pendingLinks.data.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-foreground font-medium">
                      {request.community.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {request.requestedBy.name} · {request.venue.name} ·{" "}
                      {request.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        approveLink.mutate({ requestId: request.id })
                      }
                      disabled={approveLink.isPending || rejectLink.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        rejectLink.mutate({ requestId: request.id })
                      }
                      disabled={approveLink.isPending || rejectLink.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

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
                      {venue.archivedAt ? " · Soft-archived" : ""}
                    </p>
                  </div>
                  {venue.archivedAt ? (
                    <Badge variant="outline">Soft-archived</Badge>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </DashboardShell>
  );
}
