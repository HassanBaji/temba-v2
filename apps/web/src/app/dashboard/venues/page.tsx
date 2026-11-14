"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { PageCreateAction } from "~/components/layout/page-create-action";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export default function VenuesPage() {
  const m = useMessages();
  const v = m.webDashboard.venues;
  const venues = api.venues.list.useQuery();
  return (
    <DashboardShell
      title={m.webDashboard.meta.venues}
      description={v.description}
      action={
        <PageCreateAction href="/dashboard/venues/new" label={v.createAction} />
      }
    >
      <div className="space-y-6">
        {venues.isLoading ? <ListPageSkeleton rows={4} /> : null}

        {venues.error ? (
          <ErrorState
            title={v.errorTitle}
            error={venues.error}
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
                meta={m.webDashboard.venue.location(venue.city, venue.country)}
                trailing={
                  venue.archivedAt || venue.isPartner ? (
                    <div className="flex items-center gap-2">
                      {venue.isPartner ? (
                        <Badge variant="secondary">
                          {m.webDashboard.venue.partner.badge}
                        </Badge>
                      ) : null}
                      {venue.archivedAt ? (
                        <Badge variant="outline">
                          {m.webDashboard.venue.softArchivedBadge}
                        </Badge>
                      ) : null}
                    </div>
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
