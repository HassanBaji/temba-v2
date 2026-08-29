"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { DashboardShell } from "~/components/dashboard-shell";
import { Section } from "~/components/layout/section";
import { GameFormatBadge } from "~/components/temba/typed-labels";
import { Button } from "~/components/ui/button";
import { formatGameStart } from "~/lib/format-game-start";
import { api } from "~/trpc/react";

export default function GamesHubPage() {
  const pickup = api.games.listPublicPickup.useQuery();

  return (
    <DashboardShell
      title="Games"
      description="Public pickup Games, and a groupless Friendly game you organize."
      action={
        <Button asChild>
          <Link href="/dashboard/games/new">Create Game</Link>
        </Button>
      }
    >
      {pickup.isLoading ? <ListPageSkeleton rows={4} /> : null}

      {pickup.error ? (
        <ErrorState
          title="Games could not be loaded"
          message={pickup.error.message}
          onRetry={() => {
            void pickup.refetch();
          }}
        />
      ) : null}

      {pickup.data ? (
        <Section title="Public pickup">
          {pickup.data.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No public Games right now"
              description="Soft-archived Club Group Games stay off this list."
            />
          ) : (
            <RowList>
              {pickup.data.map((game) => (
                <ListRow
                  key={game.id}
                  asChild
                  title={game.name ?? "Untitled Game"}
                  meta={`${game.groupName ?? "Groupless"} · ${formatGameStart(game.startTime)}`}
                  trailing={<GameFormatBadge format={game.format} />}
                >
                  <Link href={`/dashboard/games/${game.id}`} />
                </ListRow>
              ))}
            </RowList>
          )}
        </Section>
      ) : null}
    </DashboardShell>
  );
}
