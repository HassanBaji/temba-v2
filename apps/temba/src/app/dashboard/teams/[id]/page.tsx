"use client";

import Link from "next/link";
import { use } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function TeamHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const team = api.teams.byId.useQuery({ id });

  return (
    <DashboardShell title={team.data?.displayName ?? "Team"}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {team.isLoading ? (
              <>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
              </>
            ) : null}

            {team.error ? (
              <p className="text-destructive text-sm">{team.error.message}</p>
            ) : null}

            {team.data ? (
              <>
                <h2 className="text-foreground text-2xl font-semibold tracking-tight">
                  {team.data.displayName}
                </h2>
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                  <span className="capitalize">{team.data.sport}</span>
                  {team.data.isLoose ? (
                    <span>· Unattached</span>
                  ) : (
                    <span>· Club Team</span>
                  )}
                  {team.data.membership ? (
                    <span>· You are a member</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {team.data.sport}
                  </Badge>
                  {team.data.isLoose ? (
                    <Badge variant="outline">Loose Team</Badge>
                  ) : (
                    <Badge variant="outline">Club Team</Badge>
                  )}
                  {team.data.waitingForPartner ? (
                    <Badge variant="outline">Waiting for partner</Badge>
                  ) : null}
                </div>
                {team.data.community ? (
                  <p className="text-muted-foreground text-sm">
                    Linked to{" "}
                    <Link
                      href={`/dashboard/communities/${team.data.community.id}`}
                      className="hover:text-foreground underline underline-offset-2"
                    >
                      {team.data.community.name}
                    </Link>
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    This Team is not linked to a Community.
                  </p>
                )}
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {team.data ? (
              <Button variant="outline" asChild>
                <Link href="/dashboard/teams">My Teams</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {team.data ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Members
            </h3>
            <ul className="divide-border border-border bg-card divide-y rounded-xl border">
              {team.data.members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-foreground font-medium">
                    {member.name}
                    {member.isViewer ? (
                      <span className="text-muted-foreground ml-2 text-sm font-normal">
                        (you)
                      </span>
                    ) : null}
                  </p>
                  {member.isCreator ? (
                    <Badge variant="outline">Creator</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
            {team.data.waitingForPartner ? (
              <p className="text-muted-foreground text-sm">
                Waiting for a partner. This Team is incomplete until a second
                member joins.
              </p>
            ) : null}
          </section>
        ) : null}

        {team.data ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Team stats
            </h3>
            <p className="text-muted-foreground text-sm">
              Stored partnership counters. They start at zero until Games
              complete.
            </p>
            <dl className="border-border bg-card grid grid-cols-1 divide-y rounded-xl border md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Games played</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {team.data.gamesPlayed}
                </dd>
              </div>
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Wins</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {team.data.wins}
                </dd>
              </div>
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Losses</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {team.data.losses}
                </dd>
              </div>
            </dl>
            {team.data.waitingForPartner ? (
              <p className="text-muted-foreground text-sm">
                Waiting for a partner — stats stay at zero until the Team is
                full and Games are completed.
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
