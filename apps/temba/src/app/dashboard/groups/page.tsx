"use client";

import { Users } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export default function GroupsIndexPage() {
  const groups = api.groups.mine.useQuery();
  const { hasCreateAccess } = useCreateAccess();

  return (
    <DashboardShell
      title="Groups"
      description="Groups you are a member of. Open one to go to its home."
      action={
        hasCreateAccess ? (
          <Button asChild>
            <Link href="/dashboard/groups/new">Create Group</Link>
          </Button>
        ) : undefined
      }
    >
      {groups.isLoading ? <ListPageSkeleton rows={4} /> : null}

      {groups.error ? (
        <ErrorState
          title="Groups could not be loaded"
          message={groups.error.message}
          onRetry={() => {
            void groups.refetch();
          }}
        />
      ) : null}

      {groups.data?.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Groups yet"
          description="Groups are where you play and where your Standing lives."
          action={
            hasCreateAccess ? (
              <Button asChild>
                <Link href="/dashboard/groups/new">Create Group</Link>
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {groups.data && groups.data.length > 0 ? (
        <RowList>
          {groups.data.map((group) => (
            <ListRow
              key={group.id}
              asChild
              leading={
                <EntityMonogram name={group.name ?? "Group"} size="lg" />
              }
              title={group.name ?? "Untitled Group"}
              meta={
                group.community
                  ? `${group.community.name} · Club Group`
                  : "Group outside a Community"
              }
              trailing={
                <div className="flex flex-wrap items-center gap-2">
                  {group.community?.archivedAt ? (
                    <Badge variant="outline">Soft-archived</Badge>
                  ) : null}
                  {group.sport ? <SportBadge sport={group.sport} /> : null}
                </div>
              }
            >
              <Link href={`/dashboard/groups/${group.id}`} />
            </ListRow>
          ))}
        </RowList>
      ) : null}
    </DashboardShell>
  );
}
