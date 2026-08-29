"use client";

import { Building2, Inbox } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { DashboardShell } from "~/components/dashboard-shell";
import { RequestRow } from "~/components/invites/request-row";
import { Section } from "~/components/layout/section";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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

  const requestCount = pendingLinks.data?.length ?? 0;

  return (
    <DashboardShell
      title="Venues"
      description="Physical sites in the catalog, including Soft-archived Venues. Create a Venue before any Community claims it."
      action={
        <Button asChild>
          <Link href="/dashboard/venues/new">Create Venue</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Section
          title="Requests"
          description="Approve sets the Community live Venue pointer. Reject is silent and does not admit Users."
          action={
            requestCount > 0 ? (
              <Badge variant="secondary">{requestCount}</Badge>
            ) : null
          }
        >
          {pendingLinks.isLoading ? <ListPageSkeleton rows={2} /> : null}
          {pendingLinks.error ? (
            <ErrorState
              title="Requests could not be loaded"
              message={pendingLinks.error.message}
              onRetry={() => {
                void pendingLinks.refetch();
              }}
            />
          ) : null}
          {pendingLinks.data?.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No pending requests"
              description="Venue link requests from Communities will show up here."
            />
          ) : null}
          {pendingLinks.data && pendingLinks.data.length > 0 ? (
            <ul className="divide-border divide-y overflow-hidden rounded-lg border">
              {pendingLinks.data.map((request) => {
                const approvePending =
                  approveLink.isPending &&
                  approveLink.variables?.requestId === request.id;
                const rejectPending =
                  rejectLink.isPending &&
                  rejectLink.variables?.requestId === request.id;
                return (
                  <RequestRow
                    key={request.id}
                    title={request.community.name}
                    meta={`Venue link request for ${request.venue.name}`}
                    approvePending={approvePending}
                    rejectPending={rejectPending}
                    onApprove={() =>
                      approveLink.mutate({ requestId: request.id })
                    }
                    onReject={() =>
                      rejectLink.mutate({ requestId: request.id })
                    }
                  />
                );
              })}
            </ul>
          ) : null}
        </Section>

        {venues.isLoading ? <ListPageSkeleton rows={4} /> : null}

        {venues.error ? (
          <ErrorState
            title="Venues could not be loaded"
            message={venues.error.message}
            onRetry={() => {
              void venues.refetch();
            }}
          />
        ) : null}

        {venues.data?.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No Venues yet"
            description="Create a Venue to start the catalog."
            action={
              <Button asChild>
                <Link href="/dashboard/venues/new">Create Venue</Link>
              </Button>
            }
          />
        ) : null}

        {venues.data && venues.data.length > 0 ? (
          <RowList>
            {venues.data.map((venue) => (
              <ListRow
                key={venue.id}
                asChild
                leading={<EntityMonogram name={venue.name} size="lg" />}
                title={venue.name}
                meta={`${venue.city}, ${venue.country}`}
                trailing={
                  venue.archivedAt ? (
                    <Badge variant="outline">Soft-archived</Badge>
                  ) : undefined
                }
              >
                <Link href={`/dashboard/venues/${venue.id}`} />
              </ListRow>
            ))}
          </RowList>
        ) : null}
      </div>
    </DashboardShell>
  );
}
