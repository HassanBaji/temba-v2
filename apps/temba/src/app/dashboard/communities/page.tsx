"use client";

import Link from "next/link";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function MyCommunitiesPage() {
  const mine = api.communities.mine.useQuery();

  return (
    <DashboardShell title="My Communities">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              My Communities
            </h2>
            <p className="text-muted-foreground text-sm">
              Communities you belong to. Open one to return to its home.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/groups/new">Create Loose Group</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/communities/new">Create Community</Link>
            </Button>
          </div>
        </div>

        {mine.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {mine.error ? (
          <p className="text-destructive text-sm">{mine.error.message}</p>
        ) : null}

        {mine.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You are not in any Communities yet.
          </p>
        ) : null}

        {mine.data && mine.data.length > 0 ? (
          <ul className="divide-border border-border bg-card divide-y rounded-xl border">
            {mine.data.map((community) => (
              <li key={community.id}>
                <Link
                  href={`/dashboard/communities/${community.id}`}
                  className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">
                      {community.name}
                    </p>
                    <p className="text-muted-foreground text-sm capitalize">
                      {community.type} · {community.role}
                      {community.archivedAt ? " · Soft-archived" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {community.archivedAt ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : null}
                    {community.sports.map((sport) => (
                      <Badge key={sport} variant="secondary">
                        {sport}
                      </Badge>
                    ))}
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
