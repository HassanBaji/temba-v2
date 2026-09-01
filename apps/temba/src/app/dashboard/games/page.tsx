"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { RowList } from "~/components/common/row-list";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameSummaryCard } from "~/components/games/game-summary-card";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import {
  gameSummaryPrimaryAction,
  showsFriendlyRoster,
} from "~/lib/game-summary-cta";
import { api, type RouterOutputs } from "~/trpc/react";

type HubGame = RouterOutputs["games"]["listMyGames"][number];

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
  onJoinSeat,
  onJoinWaitlist,
  onRegister,
  pendingGameId,
}: {
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  games?: HubGame[];
  emptyTitle: string;
  emptyDescription: string;
  onJoinSeat: (
    gameId: string,
    sideIndex: number,
    position: "left" | "right",
  ) => void;
  onJoinWaitlist: (game: HubGame) => void;
  onRegister: (gameId: string) => void;
  pendingGameId: string | null;
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
      {games.map((game) => {
        const primaryAction = gameSummaryPrimaryAction(game);
        return (
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
            sides={
              showsFriendlyRoster(game.format, game.registrationMode)
                ? game.sides
                : undefined
            }
            primaryAction={primaryAction}
            actionPending={pendingGameId === game.id}
            href={`/dashboard/games/${game.id}`}
            onJoinSeat={(sideIndex, position) => {
              onJoinSeat(game.id, sideIndex, position);
            }}
            onJoinWaitlist={() => {
              onJoinWaitlist(game);
            }}
            onRegister={() => {
              onRegister(game.id);
            }}
          />
        );
      })}
    </RowList>
  );
}

export default function GamesHubPage() {
  const myGames = api.games.listMyGames.useQuery();
  const pickup = api.games.listPublicPickup.useQuery();
  const { hasCreateAccess } = useCreateAccess();
  const utils = api.useUtils();

  async function refreshLists() {
    await Promise.all([
      utils.games.listMyGames.invalidate(),
      utils.games.listPublicPickup.invalidate(),
      utils.users.home.invalidate(),
      utils.games.byId.invalidate(),
    ]);
  }

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Seated");
      await refreshLists();
    },
    onError: async (error) => {
      toastGlobalFormError(error);
      await refreshLists();
    },
  });

  const register = api.games.register.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Registered");
      await refreshLists();
    },
    onError: async (error) => {
      toastGlobalFormError(error);
      await refreshLists();
    },
  });

  const pendingGameId =
    (registerSeat.isPending ? registerSeat.variables?.gameId : null) ??
    (register.isPending ? register.variables?.gameId : null) ??
    null;

  function onJoinSeat(
    gameId: string,
    sideIndex: number,
    position: "left" | "right",
  ) {
    registerSeat.mutate({ gameId, sideIndex, position });
  }

  function onJoinWaitlist(game: HubGame) {
    if (game.format === "americano") {
      register.mutate({ gameId: game.id });
      return;
    }
    registerSeat.mutate({ gameId: game.id });
  }

  function onRegister(gameId: string) {
    register.mutate({ gameId });
  }

  return (
    <DashboardShell
      title="Games"
      description="Upcoming Games on your Groups, private Games you created or joined, and public pickup."
      action={
        hasCreateAccess ? (
          <Button asChild>
            <Link href="/dashboard/games/new">Create Game</Link>
          </Button>
        ) : undefined
      }
    >
      <Tabs defaultValue="my-games" className="gap-4">
        <TabsList
          variant="line"
          className="h-11 min-h-11 w-full max-w-full justify-start rounded-none"
        >
          <TabsTrigger
            value="my-games"
            className="min-h-11 min-w-11 flex-none px-3"
          >
            My Games
          </TabsTrigger>
          <TabsTrigger
            value="public"
            className="min-h-11 min-w-11 flex-none px-3"
          >
            Public
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="my-games"
          className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px]"
        >
          <GamesHubTabPanel
            isLoading={myGames.isLoading}
            errorMessage={myGames.error?.message}
            onRetry={() => {
              void myGames.refetch();
            }}
            games={myGames.data}
            emptyTitle="No Games in My Games"
            emptyDescription="Live Games on Groups you belong to, plus private Games you created or joined, will show up here."
            onJoinSeat={onJoinSeat}
            onJoinWaitlist={onJoinWaitlist}
            onRegister={onRegister}
            pendingGameId={pendingGameId}
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
            onJoinSeat={onJoinSeat}
            onJoinWaitlist={onJoinWaitlist}
            onRegister={onRegister}
            pendingGameId={pendingGameId}
          />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
