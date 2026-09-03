"use client";

import { Building2 } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { CommunityTypeBadge } from "~/components/temba/community-type-badge";
import { GroupTypeBadge } from "~/components/temba/group-type-badge";
import { RoleBadge } from "~/components/temba/role-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

function CommunitiesListSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="bg-surface-raised space-y-0 rounded-lg p-4">
          <div className="flex items-center gap-3 pb-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-none" />
          <Skeleton className="h-16 w-full rounded-none" />
        </div>
      ))}
    </div>
  );
}

export default function CommunitiesPage() {
  const mine = api.communities.mine.useQuery();
  const { hasCreateAccess } = useCreateAccess();

  return (
    <DashboardShell
      title="Communities"
      description="Communities you belong to, with every Club Group nested. Open a Community or Group to go to its home."
      action={
        hasCreateAccess ? (
          <Button asChild>
            <Link href="/dashboard/communities/new">Create Community</Link>
          </Button>
        ) : undefined
      }
    >
      {mine.isLoading ? <CommunitiesListSkeleton /> : null}

      {mine.error ? (
        <ErrorState
          title="Communities could not be loaded"
          message={mine.error.message}
          onRetry={() => {
            void mine.refetch();
          }}
        />
      ) : null}

      {mine.data?.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Communities yet"
          description="Communities organise Club Groups around a Venue."
          action={
            hasCreateAccess ? (
              <Button asChild>
                <Link href="/dashboard/communities/new">Create Community</Link>
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {mine.data && mine.data.length > 0 ? (
        <ul className="space-y-4">
          {mine.data.map((community) => (
            <li key={community.id}>
              <Card variant="raised" className="p-0">
                <Link
                  href={`/dashboard/communities/${community.id}`}
                  className="focus-visible:ring-ring/50 flex min-h-16 items-center gap-3 p-4 outline-none focus-visible:ring-[3px]"
                >
                  <EntityMonogram name={community.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lead truncate font-semibold">
                      {community.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <CommunityTypeBadge type={community.type} />
                      <RoleBadge role={community.role} />
                      {community.archivedAt ? (
                        <Badge variant="outline">Soft-archived</Badge>
                      ) : null}
                    </div>
                  </div>
                </Link>
                <RowList>
                  {community.groups.length === 0 ? (
                    <li className="text-muted-foreground text-meta min-h-16 px-4 py-3">
                      No Groups yet
                    </li>
                  ) : (
                    community.groups.map((group) => (
                      <ListRow
                        key={group.id}
                        asChild
                        title={group.name ?? "Untitled Group"}
                        meta={group.isMember ? "Joined" : undefined}
                        trailing={
                          <div className="flex flex-wrap items-center gap-2">
                            <GroupTypeBadge isLoose={false} type={group.type} />
                            {group.sport ? (
                              <SportBadge sport={group.sport} />
                            ) : null}
                          </div>
                        }
                      >
                        <Link href={`/dashboard/groups/${group.id}`} />
                      </ListRow>
                    ))
                  )}
                </RowList>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </DashboardShell>
  );
}
