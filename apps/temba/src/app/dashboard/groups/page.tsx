"use client";

import Link from "next/link";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function GroupsIndexPage() {
  const groups = api.groups.mine.useQuery();

  return (
    <DashboardShell title="Groups">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              Groups
            </h2>
            <p className="text-muted-foreground text-sm">
              Groups you are a member of. Open one to go to its home.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/groups/new">Create Group</Link>
          </Button>
        </div>

        {groups.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {groups.error ? (
          <p className="text-destructive text-sm">{groups.error.message}</p>
        ) : null}

        {groups.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You are not in any Groups yet.
          </p>
        ) : null}

        {groups.data && groups.data.length > 0 ? (
          <ul className="divide-border border-border bg-card divide-y rounded-xl border">
            {groups.data.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/dashboard/groups/${group.id}`}
                  className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">
                      {group.name ?? "Untitled Group"}
                    </p>
                    <p className="text-muted-foreground text-sm capitalize">
                      {group.community
                        ? `${group.community.name} · ${group.type}`
                        : group.type}
                      {group.community?.archivedAt ? " · Soft-archived" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.community?.archivedAt ? (
                      <Badge variant="outline">Soft-archived</Badge>
                    ) : null}
                    {group.sport ? (
                      <Badge variant="secondary">{group.sport}</Badge>
                    ) : null}
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
