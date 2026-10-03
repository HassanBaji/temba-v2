"use client";

import { Calendar, Trophy } from "lucide-react";
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
import {
  TournamentMatchCard,
  TournamentSummaryCard,
} from "~/components/games/tournament-summary-card";
import { PageCreateAction } from "~/components/layout/page-create-action";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { offersPartnerJoin } from "~/lib/friendly-game-partner";
import { gameJoinToast } from "~/lib/game-copy";
import { gamesHubTabFromQuery, gamesHubTabQuery } from "~/lib/games-hub-tab";
import {
  gameSummaryPrimaryAction,
  gameViewerStatus,
  showsFriendlyRoster,
  showsGameCardPartnerFooter,
} from "~/lib/game-summary-cta";
import { isTournamentMatchRow } from "~/lib/tournament-card";
import { isDrawnTournament, poolRoundLabel } from "~/lib/tournament-rounds";
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
            className="bg-paper border-rule rounded-card flex flex-col gap-4 overflow-hidden border p-5"
          >
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex items-baseline gap-2.5">
              <Skeleton className="h-12 w-28" />
              <Skeleton className="h-5 w-10" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="h-4 w-32 max-w-full" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex-1 space-y-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-[46px] flex-1 rounded-lg" />
              <Skeleton className="h-[46px] flex-1 rounded-lg" />
              <Skeleton className="h-3 w-4" />
              <Skeleton className="h-[46px] flex-1 rounded-lg" />
              <Skeleton className="h-[46px] flex-1 rounded-lg" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-24 max-w-full" />
              </div>
              <Skeleton className="h-10 w-24 rounded-sm" />
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
      {games.map((game) => {
        if (isTournamentMatchRow(game)) {
          return (
            <TournamentMatchCard
              key={game.matchId}
              game={game}
              href={`/dashboard/games/${game.id}`}
            />
          );
        }
        if (
          isDrawnTournament(game.format, game.poolCount, game.tournamentShape)
        ) {
          return (
            <TournamentSummaryCard
              key={game.id}
              game={game}
              href={`/dashboard/games/${game.id}`}
              actionPending={pendingGameId === game.id}
              onJoinSeat={(sideIndex, position) => {
                onJoinSeat(game.id, sideIndex, position);
              }}
              onJoinWaitlist={() => {
                onJoinWaitlist(game);
              }}
            />
          );
        }
        const primaryAction = gameSummaryPrimaryAction(game);
        const rosterSides =
          showsFriendlyRoster(game.format, game.registrationMode) ||
          game.matchId
            ? game.sides
            : undefined;
        const showPartnerJoin =
          showsGameCardPartnerFooter(primaryAction, rosterSides) &&
          offersPartnerJoin({
            canRegister: game.canRegister,
            format: game.format,
            registrationMode: game.registrationMode,
            sides: game.sides,
          });
        return (
          <GameSummaryCard
            key={game.matchId ?? game.id}
            gameId={game.id}
            name={game.name}
            startTime={game.startTime}
            groupName={game.groupName}
            format={game.format}
            registrationMode={game.registrationMode}
            canRegister={game.canRegister}
            windowStart={game.windowStart}
            windowEnd={game.windowEnd}
            venueName={game.venue?.name}
            location={game.venue?.city ?? game.venue?.name}
            registeredUserCount={game.registeredUserCount}
            playersAllowed={game.playersAllowed}
            pricePerPlayerCents={game.pricePerPlayerCents}
            levelMinTenths={game.levelMinTenths}
            levelMaxTenths={game.levelMaxTenths}
            sides={rosterSides}
            primaryAction={primaryAction}
            viewerStatus={gameViewerStatus(game)}
            actionPending={pendingGameId === game.id}
            href={`/dashboard/games/${game.id}`}
            showPartnerJoin={showPartnerJoin}
            roundLabel={poolRoundLabel(game.roundNumber, game.roundCount)}
            courtName={game.courtName}
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
            className="bg-paper border-rule rounded-card flex flex-col gap-4 overflow-hidden border p-5"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="mt-0.5 size-6 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-6 w-40 max-w-full" />
                <Skeleton className="h-4 w-48 max-w-full" />
              </div>
              <Skeleton className="mt-1 h-3 w-16 shrink-0" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-[52px] w-full rounded-lg" />
              <Skeleton className="h-[52px] w-full rounded-lg" />
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

  if (!rows) {
    return null;
  }

  if (rows.length === 0) {
    return emptyState;
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <MatchHistoryCard key={row.matchId} row={row} />
      ))}
    </ul>
  );
}

function TabCount({ count }: { count: number | undefined }) {
  if (!count) {
    return null;
  }

  return (
    <span className="text-muted-foreground group-data-[state=active]/tab:text-dim">
      {count}
    </span>
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
  const history = api.games.listMyMatchHistory.useQuery();
  const { hasCreateAccess } = useCreateAccess();
  const utils = api.useUtils();

  async function refreshLists() {
    await Promise.all([
      utils.games.listMyGames.invalidate(),
      utils.games.listMyMatchHistory.invalidate(),
      utils.users.home.invalidate(),
      utils.games.byId.invalidate(),
    ]);
  }

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: async (result) => {
      toast.success(gameJoinToast(result.waitlisted));
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
          <PageCreateAction href="/dashboard/games/new" label="Create Game" />
        ) : undefined
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="mt-4 gap-4">
        <TabsList variant="segmented">
          <TabsTrigger value="my-games" className="group/tab">
            My Games
            <TabCount count={myGames.data?.length} />
          </TabsTrigger>
          <TabsTrigger value="history" className="group/tab">
            History
            <TabCount count={history.data?.length} />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="my-games">
          <GamesHubTabPanel
            isLoading={myGames.isLoading}
            errorMessage={myGames.error?.message}
            onRetry={() => {
              void myGames.refetch();
            }}
            games={myGames.data}
            emptyState={
              <EmptyState
                icon={Calendar}
                title="No Games yet"
                description="Games you create or join show up here."
                action={
                  hasCreateAccess ? (
                    <Button asChild>
                      <Link href="/dashboard/games/new">Create Game</Link>
                    </Button>
                  ) : undefined
                }
              />
            }
            onJoinSeat={onJoinSeat}
            onJoinWaitlist={onJoinWaitlist}
            onRegister={onRegister}
            pendingGameId={pendingGameId}
          />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTabPanel
            isLoading={history.isLoading}
            errorMessage={history.error?.message}
            onRetry={() => {
              void history.refetch();
            }}
            rows={history.data}
            emptyState={
              <EmptyState
                icon={Trophy}
                title="No Match history yet"
                description="Completed Games you played in show up here."
              />
            }
          />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
