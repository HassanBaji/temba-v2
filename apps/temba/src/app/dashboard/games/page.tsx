"use client";

import Link from "next/link";

import { DashboardShell } from "~/components/dashboard-shell";
import { GameFormatBadge } from "~/components/temba/typed-labels";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { formatGameStart } from "~/lib/format-game-start";
import { api } from "~/trpc/react";

export default function GamesHubPage() {
  const pickup = api.games.listPublicPickup.useQuery();

  return (
    <DashboardShell title="Games">
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">
              Games
            </h2>
            <p className="text-muted-foreground text-sm">
              Public pickup Games, and a groupless Friendly game you organize.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/games/new">Create Game</Link>
          </Button>
        </div>

        {pickup.isLoading ? <Skeleton className="h-32 w-full" /> : null}

        {pickup.error ? (
          <p className="text-destructive text-sm">{pickup.error.message}</p>
        ) : null}

        {pickup.data ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Public pickup
            </h3>
            {pickup.data.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No public Games right now. Soft-archived Club Group Games stay
                off this list.
              </p>
            ) : (
              <ul className="divide-border border-border bg-card divide-y rounded-xl border">
                {pickup.data.map((game) => (
                  <li key={game.id}>
                    <Link
                      href={`/dashboard/games/${game.id}`}
                      className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-foreground font-medium">
                          {game.name ?? "Untitled Game"}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {game.groupName ?? "Groupless"} ·{" "}
                          {formatGameStart(game.startTime)}
                        </p>
                      </div>
                      <GameFormatBadge format={game.format} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}
