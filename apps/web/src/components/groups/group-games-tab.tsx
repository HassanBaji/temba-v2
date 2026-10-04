"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { EmptyState } from "~/components/common/empty-state";
import { GameSummaryCard } from "~/components/games/game-summary-card";
import { TournamentSummaryCard } from "~/components/games/tournament-summary-card";
import { GroupPlayedRow } from "~/components/groups/group-played-row";
import { Button } from "~/components/ui/button";
import {
  GROUP_ARCHIVE_GAMES_COPY,
  GROUP_HISTORY_PAGE_SIZE,
  groupGamesEmptyDescription,
  groupHistoryCanLoadMore,
  groupHistoryPageExhausted,
} from "@repo/domain/group-join";
import { offersPartnerJoin } from "@repo/domain/friendly-game-partner";
import {
  gameSummaryPrimaryAction,
  gameViewerStatus,
  showsFriendlyRoster,
  showsGameCardPartnerFooter,
} from "@repo/domain/game-summary-cta";
import { cardFrame } from "~/lib/page-layout";
import { isDrawnTournament } from "@repo/domain/tournament-rounds";
import { api, type RouterOutputs } from "~/trpc/react";

type GroupHome = RouterOutputs["groups"]["byId"];
type ScheduledGame = GroupHome["upcomingGames"][number];

const HEADING = "font-expanded pb-2.5 text-title leading-tight";

export function GroupGamesTab({
  upcomingGames,
  gameHistory,
  groupId,
  groupName,
  isCommunityArchived,
  canShowCreateGame,
  pendingGameId,
  onJoinSeat,
  onJoinWaitlist,
  onRegister,
}: {
  upcomingGames: GroupHome["upcomingGames"];
  gameHistory: GroupHome["gameHistory"];
  groupId: string;
  groupName: string | null;
  isCommunityArchived: boolean;
  canShowCreateGame: boolean;
  pendingGameId: string | null;
  onJoinSeat: (
    gameId: string,
    sideIndex: number,
    position: "left" | "right",
  ) => void;
  onJoinWaitlist: (game: ScheduledGame) => void;
  onRegister: (gameId: string) => void;
}) {
  const utils = api.useUtils();
  const [olderPages, setOlderPages] = React.useState<{
    source: GroupHome["gameHistory"];
    games: GroupHome["gameHistory"];
    exhausted: boolean;
  }>({ source: gameHistory, games: [], exhausted: false });
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = React.useState(false);
  const older = olderPages.source === gameHistory ? olderPages : null;
  const playedGames = [...gameHistory, ...(older?.games ?? [])];
  const canLoadMore = groupHistoryCanLoadMore({
    loadedCount: playedGames.length,
    exhausted: older?.exhausted ?? false,
  });

  async function loadMoreHistory() {
    const last = playedGames.at(-1);
    if (!last || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const next = await utils.groups.byId.fetch({
        id: groupId,
        gameHistory: {
          limit: GROUP_HISTORY_PAGE_SIZE,
          cursor: { id: last.id },
        },
      });
      setOlderPages({
        source: gameHistory,
        games: [...(older?.games ?? []), ...next.gameHistory],
        exhausted: groupHistoryPageExhausted(next.gameHistory.length),
      });
    } catch {
      setLoadMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const hasAny = upcomingGames.length > 0 || playedGames.length > 0;
  const createFirstGame = canShowCreateGame ? (
    <Button asChild variant="outline">
      <Link href={`/dashboard/games/new?groupId=${groupId}`}>
        Create the first Game
      </Link>
    </Button>
  ) : null;

  if (!hasAny) {
    return (
      <EmptyState
        icon={Calendar}
        title="No Games yet"
        description={groupGamesEmptyDescription(isCommunityArchived)}
        action={createFirstGame}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[26px]">
      <section>
        <h2 className={HEADING}>Scheduled</h2>
        {isCommunityArchived ? (
          <p className="text-body text-muted-foreground pb-2.5">
            {GROUP_ARCHIVE_GAMES_COPY}
          </p>
        ) : null}
        {upcomingGames.length === 0 ? (
          <p className="text-body text-muted-foreground">
            No upcoming Games scheduled for this Group.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcomingGames.map((game) => {
              if (
                isDrawnTournament(
                  game.format,
                  game.poolCount,
                  game.tournamentShape,
                )
              ) {
                return (
                  <TournamentSummaryCard
                    key={game.id}
                    game={game}
                    href={`/dashboard/games/${game.id}`}
                    groupName={game.groupName ?? groupName}
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
              const rosterSides = showsFriendlyRoster(
                game.format,
                game.registrationMode,
              )
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
                  key={game.id}
                  gameId={game.id}
                  name={game.name}
                  startTime={game.startTime}
                  groupName={game.groupName ?? groupName}
                  format={game.format}
                  registrationMode={game.registrationMode}
                  canRegister={game.canRegister}
                  windowStart={game.windowStart}
                  windowEnd={game.windowEnd}
                  venueName={game.venue?.name}
                  location={game.venue?.city ?? game.venue?.name}
                  registeredUserCount={game.registeredUserCount}
                  playersAllowed={game.playersAllowed}
                  pricePerPlayerFils={game.pricePerPlayerFils}
                  levelMinTenths={game.levelMinTenths}
                  levelMaxTenths={game.levelMaxTenths}
                  sides={rosterSides}
                  primaryAction={primaryAction}
                  viewerStatus={gameViewerStatus(game)}
                  actionPending={pendingGameId === game.id}
                  href={`/dashboard/games/${game.id}`}
                  showPartnerJoin={showPartnerJoin}
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
        )}
      </section>

      <section>
        <h2 className={HEADING}>Played</h2>
        {playedGames.length === 0 ? (
          <p className="text-body text-muted-foreground">
            No Game history yet.
          </p>
        ) : (
          <>
            <ul className={cardFrame}>
              {playedGames.map((game) => (
                <GroupPlayedRow key={game.id} game={game} />
              ))}
            </ul>
            {canLoadMore ? (
              <div className="mt-3 flex flex-col items-center gap-2">
                {loadMoreFailed ? (
                  <p className="text-body text-muted-foreground">
                    More Games could not be loaded.
                  </p>
                ) : null}
                <Button
                  variant="outline"
                  disabled={loadingMore}
                  onClick={() => {
                    void loadMoreHistory();
                  }}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
