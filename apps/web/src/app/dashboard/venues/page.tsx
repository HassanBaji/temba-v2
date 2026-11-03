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
import { useLocale, useMessages } from "~/components/locale-provider";
import { RequestRow } from "~/components/invites/request-row";
import { PageCreateAction } from "~/components/layout/page-create-action";
import { Section } from "~/components/layout/section";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { requestRowMeta } from "@repo/domain/request-meta";
import { api } from "~/trpc/react";

export default function VenuesPage() {
  const m = useMessages();
  const locale = useLocale();
  const v = m.webDashboard.venues;
  const utils = api.useUtils();
  const venues = api.venues.list.useQuery();
  const pendingLinks = api.venues.listPendingLinkRequests.useQuery();

  const approveLink = api.venues.approveLinkRequest.useMutation({
    onSuccess: async () => {
      toast.success(v.linkApprovedToast);
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
      toast.success(v.linkRejectedToast);
      await utils.venues.listPendingLinkRequests.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const requestCount = pendingLinks.data?.length ?? 0;

  return (
    <DashboardShell
      title={m.webDashboard.meta.venues}
      description={v.description}
      action={
        <PageCreateAction href="/dashboard/venues/new" label={v.createAction} />
      }
    >
      <div className="space-y-6">
        <Section
          title={m.community.tab.requests}
          description={v.requests.description}
          action={
            requestCount > 0 ? (
              <Badge variant="secondary">{requestCount}</Badge>
            ) : null
          }
        >
          {pendingLinks.isLoading ? <ListPageSkeleton rows={2} /> : null}
          {pendingLinks.error ? (
            <ErrorState
              headingLevel={3}
              title={v.requests.errorTitle}
              message={pendingLinks.error.message}
              onRetry={() => {
                void pendingLinks.refetch();
              }}
            />
          ) : null}
          {pendingLinks.data?.length === 0 ? (
            <EmptyState
              headingLevel={3}
              icon={Inbox}
              title={m.community.requestsEmpty.title}
              description={v.requests.emptyDescription}
            />
          ) : null}
          {pendingLinks.data && pendingLinks.data.length > 0 ? (
            <RowList>
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
                    meta={requestRowMeta(request.createdAt, locale, [
                      v.forVenue(request.venue.name),
                    ])}
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
            </RowList>
          ) : null}
        </Section>

        {venues.isLoading ? <ListPageSkeleton rows={4} /> : null}

        {venues.error ? (
          <ErrorState
            title={m.community.linkVenue.errorTitle}
            message={venues.error.message}
            onRetry={() => {
              void venues.refetch();
            }}
          />
        ) : null}

        {venues.data?.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={v.empty.title}
            description={v.empty.description}
            action={
              <Button asChild>
                <Link href="/dashboard/venues/new">{v.createAction}</Link>
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
                meta={m.community.venue.location(venue.city, venue.country)}
                trailing={
                  venue.archivedAt ? (
                    <Badge variant="outline">{m.community.badge.softArchived}</Badge>
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
