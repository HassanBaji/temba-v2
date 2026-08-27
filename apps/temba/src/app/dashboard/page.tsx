"use client";

import Link from "next/link";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

function formatGameStart(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HomePage() {
  const home = api.users.home.useQuery();

  return (
    <DashboardShell title="Home">
      <div className="space-y-8">
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            Home
          </h2>
          <p className="text-muted-foreground text-sm">
            Your Games played, upcoming Games, memberships, and standing in each
            Group.
          </p>
        </div>

        {home.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : null}

        {home.error ? (
          <p className="text-destructive text-sm">{home.error.message}</p>
        ) : null}

        {home.data ? (
          <>
            <section className="space-y-3">
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                Overview
              </h3>
              <dl className="border-border bg-card grid grid-cols-1 divide-y rounded-xl border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="space-y-1 px-4 py-4">
                  <dt className="text-muted-foreground text-sm">
                    Games played
                  </dt>
                  <dd className="text-foreground text-2xl font-semibold tracking-tight">
                    {home.data.gamesPlayed}
                  </dd>
                </div>
                <div className="space-y-1 px-4 py-4">
                  <dt className="text-muted-foreground text-sm">Communities</dt>
                  <dd className="text-foreground text-2xl font-semibold tracking-tight">
                    {home.data.communitiesCount}
                  </dd>
                </div>
                <div className="space-y-1 px-4 py-4">
                  <dt className="text-muted-foreground text-sm">Groups</dt>
                  <dd className="text-foreground text-2xl font-semibold tracking-tight">
                    {home.data.groupsCount}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="space-y-3">
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                Upcoming Games
              </h3>
              <p className="text-muted-foreground text-sm">
                Pending and confirmed Games from Groups you belong to, soonest
                first.
              </p>

              {home.data.upcomingGames.length === 0 ? (
                <div className="border-border bg-card space-y-3 rounded-xl border px-4 py-6">
                  <p className="text-muted-foreground text-sm">
                    No upcoming Games in your Groups. When a Group schedules a
                    pending or confirmed Game, it will show up here.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/hub">Groups &amp; Communities</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-border border-border bg-card divide-y rounded-xl border">
                  {home.data.upcomingGames.map((game) => (
                    <li key={game.id}>
                      <Link
                        href={`/dashboard/groups/${game.groupId}`}
                        className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-foreground font-medium">
                            {game.name ?? "Untitled Game"}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {game.groupName ?? "Group"} ·{" "}
                            {formatGameStart(game.startTime)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {game.sport ? (
                            <Badge variant="secondary" className="capitalize">
                              {game.sport}
                            </Badge>
                          ) : null}
                          <Badge variant="outline" className="capitalize">
                            {game.status}
                          </Badge>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                Standing
              </h3>
              <p className="text-muted-foreground text-sm">
                Your position on each Group&apos;s leaderboard (by sets won).
              </p>

              {home.data.standing.length === 0 ? (
                <div className="border-border bg-card space-y-3 rounded-xl border px-4 py-6">
                  <p className="text-muted-foreground text-sm">
                    You are not in any Groups yet. Join or create one to see
                    your standing on the leaderboard.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/hub">Groups &amp; Communities</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-border border-border bg-card divide-y rounded-xl border">
                  {home.data.standing.map((entry) => (
                    <li key={entry.groupId}>
                      <Link
                        href={`/dashboard/groups/${entry.groupId}`}
                        className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-foreground font-medium">
                            {entry.groupName ?? "Untitled Group"}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {entry.position} of {entry.memberCount} on the
                            leaderboard
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.sport ? (
                            <Badge variant="secondary" className="capitalize">
                              {entry.sport}
                            </Badge>
                          ) : null}
                          <span className="text-foreground text-sm font-medium tabular-nums">
                            #{entry.position}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
