"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { RowList } from "~/components/common/row-list";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameSummaryCard } from "~/components/games/game-summary-card";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

function occupancyLabel(
  registeredUserCount: number,
  playersAllowed: number | null,
) {
  if (playersAllowed != null) {
    return `${registeredUserCount}/${playersAllowed} players`;
  }
  return null;
}

function GamesHubTabPanel({
  isLoading,
  errorMessage,
  onRetry,
  games,
  emptyTitle,
  emptyDescription,
}: {
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  games?: {
    id: string;
    name: string | null;
    startTime: Date;
    windowStart: Date | null;
    windowEnd: Date | null;
    venue: { id: string; name: string; city: string } | null;
    registeredUserCount: number;
    playersAllowed: number | null;
  }[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (isLoading) {
    return <ListPageSkeleton rows={4} />;
  }

  if (errorMessage) {
    return (
      <ErrorState
        title="Games could not be loaded"
        message={errorMessage}
        onRetry={onRetry}
      />
    );
  }

  if (!games) {
    return null;
  }

  if (games.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <RowList>
      {games.map((game) => (
        <GameSummaryCard
          key={game.id}
          name={game.name}
          startTime={game.startTime}
          windowStart={game.windowStart}
          windowEnd={game.windowEnd}
          venueName={game.venue?.name}
          location={game.venue?.city ?? game.venue?.name}
          occupancy={occupancyLabel(
            game.registeredUserCount,
            game.playersAllowed,
          )}
          actionLabel="View"
          href={`/dashboard/games/${game.id}`}
        />
      ))}
    </RowList>
  );
}

export default function GamesHubPage() {
  const myGroups = api.games.listMyGroups.useQuery();
  const pickup = api.games.listPublicPickup.useQuery();
  const { hasCreateAccess } = useCreateAccess();

  return (
    <DashboardShell
      title="Games"
      description="Upcoming Games on your Groups, and public pickup."
      action={
        hasCreateAccess ? (
          <Button asChild>
            <Link href="/dashboard/games/new">Create Game</Link>
          </Button>
        ) : undefined
      }
    >
      <Tabs defaultValue="my-groups" className="gap-4">
        <TabsList
          variant="line"
          className="h-11 min-h-11 w-full max-w-full justify-start rounded-none"
        >
          <TabsTrigger
            value="my-groups"
            className="min-h-11 min-w-11 flex-none px-3"
          >
            My Groups
          </TabsTrigger>
          <TabsTrigger
            value="public"
            className="min-h-11 min-w-11 flex-none px-3"
          >
            Public
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="my-groups"
          className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px]"
        >
          <GamesHubTabPanel
            isLoading={myGroups.isLoading}
            errorMessage={myGroups.error?.message}
            onRetry={() => {
              void myGroups.refetch();
            }}
            games={myGroups.data}
            emptyTitle="No Games in my Groups"
            emptyDescription="Live Games on Groups you belong to will show up here."
          />
        </TabsContent>
        <TabsContent
          value="public"
          className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px]"
        >
          <GamesHubTabPanel
            isLoading={pickup.isLoading}
            errorMessage={pickup.error?.message}
            onRetry={() => {
              void pickup.refetch();
            }}
            games={pickup.data}
            emptyTitle="No public Games"
            emptyDescription="Live public pickup Games will show up here."
          />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
