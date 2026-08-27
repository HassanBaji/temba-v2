"use client";

import Link from "next/link";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function GroupsAndCommunitiesHubPage() {
  const communities = api.communities.mine.useQuery();
  const looseGroups = api.groups.mineLoose.useQuery();

  const listsLoading = communities.isLoading || looseGroups.isLoading;

  return (
    <DashboardShell title="Groups & Communities">
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              Groups &amp; Communities
            </h2>
            <p className="text-muted-foreground text-sm">
              Communities and Loose Groups you belong to. Open one to go to its
              home.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/directory">Find clubs</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/groups/new">Create Loose Group</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/communities/new">Create Community</Link>
            </Button>
          </div>
        </div>

        {listsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {!listsLoading ? (
          <>
            <section className="space-y-3">
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                Communities
              </h3>

              {communities.error ? (
                <p className="text-destructive text-sm">
                  {communities.error.message}
                </p>
              ) : null}

              {communities.data?.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  You are not in any Communities yet.
                </p>
              ) : null}

              {communities.data && communities.data.length > 0 ? (
                <ul className="divide-border border-border bg-card divide-y rounded-xl border">
                  {communities.data.map((community) => (
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
                            <Badge variant="outline">Soft-archived</Badge>
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
            </section>

            <section className="space-y-3">
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                Loose Groups
              </h3>

              {looseGroups.error ? (
                <p className="text-destructive text-sm">
                  {looseGroups.error.message}
                </p>
              ) : null}

              {looseGroups.data?.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  You are not in any Loose Groups yet.
                </p>
              ) : null}

              {looseGroups.data && looseGroups.data.length > 0 ? (
                <ul className="divide-border border-border bg-card divide-y rounded-xl border">
                  {looseGroups.data.map((group) => (
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
                            {group.type}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.sport ? (
                            <Badge variant="secondary">{group.sport}</Badge>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
