"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use } from "react";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { useCreateAccess } from "~/components/create-access-gate";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameSummaryCard } from "~/components/games/game-summary-card";
import { MatchHistoryCard } from "~/components/games/match-history-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { gamesHubTabFromQuery, gamesHubTabQuery } from "~/lib/games-hub-tab";
import {
  gameSummaryPrimaryAction,
  gameViewerStatus,
  showsFriendlyRoster,
} from "~/lib/game-summary-cta";
import { api, type RouterOutputs } from "~/trpc/react";

type HubGame = RouterOutputs["games"]["listMyGames"][number];
type HistoryRow = RouterOutputs["games"]["listMyMatchHistory"][number];

function GamesHubTabPanel({
  isLoading,
  errorMessage,
  onRetry,
  games,
  emptyState,
  onJoinSeat,
  onJoinWaitlist,
  onRegister,
  pendingGameId,
}: {
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  games?: HubGame[];
  emptyState: React.ReactNode;
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
    return (
      <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-card border-border shadow-xs flex flex-col gap-3 rounded-xl border p-4 md:p-5"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-36 max-w-full" />
                <Skeleton className="h-5 w-16 rounded-sm" />
              </div>
              <Skeleton className="h-5 w-48 max-w-full" />
            </div>
            <Skeleton className="h-[5.5rem] w-full rounded-lg" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap gap-x-4 gap-y-2">
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-10 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    );
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
    return emptyState;
  }

  return (
    <ul className="flex flex-col gap-3">
      {games.map((game) => (
        <GameSummaryCard
          key={game.id}
          name={game.name}
          startTime={game.startTime}
          windowStart={game.windowStart}
          windowEnd={game.windowEnd}
          venueName={game.venue?.name}
          location={game.venue?.city ?? game.venue?.name}
          registeredUserCount={game.registeredUserCount}
          playersAllowed={game.playersAllowed}
          pricePerPlayerCents={game.pricePerPlayerCents}
          levelMinTenths={game.levelMinTenths}
          levelMaxTenths={game.levelMaxTenths}
          sides={
            showsFriendlyRoster(game.format, game.registrationMode)
              ? game.sides
              : undefined
          }
          primaryAction={gameSummaryPrimaryAction(game)}
          viewerStatus={gameViewerStatus(game)}
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
      ))}
    </ul>
  );
}

function HistoryTabPanel({
  isLoading,
  errorMessage,
  onRetry,
  rows,
  emptyState,
}: {
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  rows?: HistoryRow[];
  emptyState: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-card border-border shadow-xs flex items-center gap-3 rounded-xl border p-4 md:p-5"
          >
            <div className="w-16 shrink-0 space-y-1.5">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="h-4 w-28 max-w-full" />
              <Skeleton className="h-4 w-24 max-w-full" />
            </div>
            <Skeleton className="h-6 w-14 rounded-sm" />
          </div>
        ))}
      </div>
    );
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

  if (!rows) {
    return null;
  }

  if (rows.length === 0) {
    return emptyState;
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <MatchHistoryCard key={row.id} row={row} />
      ))}
    </ul>
  );
}

function TabCount({ count }: { count: number | undefined }) {
  if (!count) {
    return null;
  }

  return (
    <Badge variant="secondary" size="sm" className="tabular-nums">
      {count}
    </Badge>
  );
}

export default function GamesHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const query = use(searchParams);
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab = gamesHubTabFromQuery(tabParam);
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard/games";

  function setTab(next: string) {
    const resolved = gamesHubTabFromQuery(next);
    if (resolved === tab) {
      return;
    }
    router.replace(`${pathname}${gamesHubTabQuery(resolved)}`, {
      scroll: false,
    });
  }

  const myGames = api.games.listMyGames.useQuery();
  const pickup = api.games.listPublicPickup.useQuery();
  const history = api.games.listMyMatchHistory.useQuery();
  const { hasCreateAccess } = useCreateAccess();
  const utils = api.useUtils();

  async function refreshLists() {
    await Promise.all([
      utils.games.listMyGames.invalidate(),
      utils.games.listPublicPickup.invalidate(),
      utils.games.listMyMatchHistory.invalidate(),
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
      action={
        hasCreateAccess ? (
          <Button asChild>
            <Link href="/dashboard/games/new">Create Game</Link>
          </Button>
        ) : undefined
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList
          variant="line"
          className="h-11 min-h-11 w-full max-w-full justify-start rounded-none"
        >
          <TabsTrigger
            value="my-games"
            className="min-h-11 min-w-11 flex-none px-3"
          >
            My Games
            <TabCount count={myGames.data?.length} />
          </TabsTrigger>
          <TabsTrigger
            value="public"
            className="min-h-11 min-w-11 flex-none px-3"
          >
            Public
            <TabCount count={pickup.data?.length} />
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="min-h-11 min-w-11 flex-none px-3"
          >
            History
            <TabCount count={history.data?.length} />
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
            emptyState={
              <EmptyState
                emoji="🎾"
                title="No games yet"
                description="Games you create or join show up here."
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {hasCreateAccess ? (
                      <Button asChild>
                        <Link href="/dashboard/games/new">Create Game</Link>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTab("public");
                      }}
                    >
                      Find a public game
                    </Button>
                  </div>
                }
              />
            }
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
            emptyState={
              <EmptyState
                emoji="🌍"
                title="Nothing open right now"
                description="Public pickup games show up here as soon as they open."
              />
            }
            onJoinSeat={onJoinSeat}
            onJoinWaitlist={onJoinWaitlist}
            onRegister={onRegister}
            pendingGameId={pendingGameId}
          />
        </TabsContent>
        <TabsContent
          value="history"
          className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px]"
        >
          <HistoryTabPanel
            isLoading={history.isLoading}
            errorMessage={history.error?.message}
            onRetry={() => {
              void history.refetch();
            }}
            rows={history.data}
            emptyState={
              <EmptyState
                emoji="🏆"
                title="No match history yet"
                description="Completed Games you played in show up here."
              />
            }
          />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
