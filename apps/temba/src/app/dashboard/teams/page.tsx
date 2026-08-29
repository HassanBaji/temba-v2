"use client";

import Link from "next/link";

import { DashboardShell } from "~/components/dashboard-shell";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function TeamsIndexPage() {
  const teams = api.teams.mine.useQuery();

  return (
    <DashboardShell title="My Teams">
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              My Teams
            </h2>
            <p className="text-muted-foreground text-sm">
              Partnerships you sit on. Open one to go to its home. Pending
              Lookup invites are on Invites.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/teams/new">Create Team</Link>
          </Button>
        </div>

        {teams.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {teams.error ? (
          <p className="text-destructive text-sm">{teams.error.message}</p>
        ) : null}

        {teams.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You are not on any Teams yet.
          </p>
        ) : null}

        {teams.data && teams.data.length > 0 ? (
          <ul className="divide-border border-border bg-card divide-y rounded-xl border">
            {teams.data.map((team) => (
              <li key={team.id}>
                <Link
                  href={`/dashboard/teams/${team.id}`}
                  className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-foreground font-medium">
                      {team.displayName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {team.community ? team.community.name : "Unattached"}
                      {team.incomplete ? " · Waiting for partner" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {team.community ? (
                      <Badge variant="outline">Club Team</Badge>
                    ) : (
                      <Badge variant="outline">Unattached</Badge>
                    )}
                    {team.sport ? <SportBadge sport={team.sport} /> : null}
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
