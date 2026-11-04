"use client";

import { Calendar, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { EmptyState } from "~/components/common/empty-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { FootballGameCard } from "~/components/games/football-game-card";
import { GameSummaryCard } from "~/components/games/game-summary-card";
import { TournamentSummaryCard } from "~/components/games/tournament-summary-card";
import { NotSetCell } from "~/components/temba/not-set-cell";
import { GroupPlayedRow } from "~/components/groups/group-played-row";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  seasonBoundaryLabel,
  seasonForDate,
  type GroupSeasonData,
} from "@repo/domain/group-season";
import { Button } from "~/components/ui/button";
import {
  GROUP_HISTORY_PAGE_SIZE,
  groupArchiveGamesCopy,
  groupGamesEmptyDescription,
  groupHistoryCanLoadMore,
  groupHistoryPageExhausted,
} from "@repo/domain/group-join";
import {
  groupGamePlayersNeeded,
  groupGamesEmptyLine,
} from "@repo/domain/group-empty-states";
import { offersPartnerJoin } from "@repo/domain/friendly-game-partner";
import {
  gameSummaryPrimaryAction,
  gameViewerStatus,
  showsFriendlyRoster,
  showsGameCardPartnerFooter,
} from "@repo/domain/game-summary-cta";
import { cardFrame } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import { isDrawnTournament } from "@repo/domain/tournament-rounds";
import { api, type RouterOutputs } from "~/trpc/react";

type GroupHome = RouterOutputs["groups"]["byId"];
type ScheduledGame = GroupHome["upcomingGames"][number];

const HEADING = "font-expanded pb-2.5 text-title leading-tight";

type GroupMemberSeat = {
  userId: string;
  name: string | null;
  image?: string | null;
  isViewer: boolean;
};

/**
 * Design "Group empty states" 02: the first Game drawn as a placeholder card,
 * its seats filled by the members so far and hatched for the rest.
 */
function NoGamesYet({
  sport,
  members,
  isMember,
  createGameHref,
  onInvite,
}: {
  sport: string | null;
  members: GroupMemberSeat[];
  isMember: boolean;
  createGameHref: string | null;
  onInvite: (() => void) | null;
}) {
  const m = useMessages();
  const locale = useLocale();
  const needed = groupGamePlayersNeeded(sport);
  const seated = [...members]
    .sort((a, b) => Number(b.isViewer) - Number(a.isViewer))
    .slice(0, needed);
  const openSeats = needed - seated.length;

  return (
    <div className="flex flex-col gap-[22px]">
      <section className={cardFrame}>
        <div className="flex flex-col gap-[18px] p-5">
          <p className="text-meta text-muted-foreground flex justify-between gap-3">
            <span>{m.webGroup.nextGame}</span>
            <span>{m.webGroup.games.notScheduled}</span>
          </p>
          <div aria-hidden="true" className="flex flex-wrap gap-1.5">
            {seated.map((member) => (
              <UserAvatar
                key={member.userId}
                name={member.name ?? m.community.memberFallback}
                image={member.image}
                className={cn(
                  "size-[34px] rounded-[9px] [&_[data-slot=avatar-fallback]]:rounded-none [&_[data-slot=avatar-fallback]]:text-[11px] [&_[data-slot=avatar-fallback]]:font-semibold",
                  member.isViewer &&
                    "[&_[data-slot=avatar-fallback]]:bg-ink [&_[data-slot=avatar-fallback]]:text-paper",
                )}
              />
            ))}
            {Array.from({ length: openSeats }, (_, index) => (
              <span key={index} className="hatch size-[34px] rounded-[9px]" />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-expanded text-h1 leading-tight">
              {m.webGroup.games.noGamesYet}
            </h2>
            <p className="text-body text-muted-foreground">
              {groupGamesEmptyLine({
                sport,
                memberCount: members.length,
                isMember,
                locale,
              })}
            </p>
          </div>
        </div>
        <dl className="border-rule divide-rule grid grid-cols-2 divide-x border-t">
          <NotSetCell label={m.webGroup.games.when} />
          <NotSetCell label={m.webGroup.games.where} />
        </dl>
      </section>
      {createGameHref || onInvite ? (
        <div className="flex flex-col gap-2">
          {createGameHref ? (
            <Button
              asChild
              size="lg"
              className="text-body w-full font-semibold"
            >
              <Link href={createGameHref}>{m.webGroup.games.createFirst}</Link>
            </Button>
          ) : null}
          {onInvite ? (
            <Button
              type="button"
              size="lg"
              variant={createGameHref ? "outline" : "default"}
              className="text-body w-full font-semibold"
              onClick={onInvite}
            >
              <UserRoundPlus aria-hidden="true" />
              {m.invite.door.invitePlayers}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

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
  sport,
  members,
  seasons = [],
  isMember,
  canInvite,
  onInvite,
}: {
  sport: string | null;
  members: GroupMemberSeat[];
  seasons?: GroupSeasonData[];
  isMember: boolean;
  canInvite: boolean;
  onInvite: () => void;
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
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const router = useRouter();
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
        {m.webGroup.games.createFirst}
      </Link>
    </Button>
  ) : null;

  if (!hasAny && !isCommunityArchived) {
    return (
      <NoGamesYet
        sport={sport}
        members={members}
        isMember={isMember}
        createGameHref={
          canShowCreateGame ? `/dashboard/games/new?groupId=${groupId}` : null
        }
        onInvite={canInvite ? onInvite : null}
      />
    );
  }

  if (!hasAny) {
    return (
      <EmptyState
        icon={Calendar}
        title={m.webGroup.games.noGamesYet}
        description={groupGamesEmptyDescription(isCommunityArchived, locale)}
        action={createFirstGame}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[26px]">
      <section>
        <h2 className={HEADING}>{m.webGroup.games.scheduled}</h2>
        {isCommunityArchived ? (
          <p className="text-body text-muted-foreground pb-2.5">
            {groupArchiveGamesCopy(locale)}
          </p>
        ) : null}
        {upcomingGames.length === 0 ? (
          <p className="text-body text-muted-foreground">
            {m.webGroup.games.noUpcoming}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcomingGames.map((game) => {
              if (game.football) {
                return (
                  <FootballGameCard
                    key={game.id}
                    game={game}
                    pending={pendingGameId === game.id}
                    onJoinWaitlist={() => {
                      onJoinWaitlist(game);
                    }}
                    onConfirm={() => {
                      router.push(`/dashboard/games/${game.id}`);
                    }}
                  />
                );
              }
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
                  sport={game.sport}
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
                  rated={game.rated}
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
        <h2 className={HEADING}>{m.webGroup.games.played}</h2>
        {playedGames.length === 0 ? (
          <p className="text-body text-muted-foreground">
            {m.webGroup.games.noHistory}
          </p>
        ) : (
          <>
            <ul className={cardFrame}>
              {playedGames.map((game, index) => {
                const season = seasonForDate(seasons, game.displayTime);
                const previous = playedGames[index - 1];
                const previousSeason = previous
                  ? seasonForDate(seasons, previous.displayTime)
                  : null;
                const boundary =
                  index > 0 && season && season.id !== previousSeason?.id
                    ? season
                    : null;
                return (
                  <React.Fragment key={game.id}>
                    {boundary ? (
                      <li
                        aria-label={boundary.name}
                        className="text-eyebrow text-muted-foreground flex items-center gap-3 px-5 py-2 tracking-[0.06em]"
                      >
                        <span
                          aria-hidden="true"
                          className="bg-rule h-px flex-1"
                        />
                        <span className="shrink-0 font-mono">
                          {seasonBoundaryLabel(boundary, locale)}
                        </span>
                        <span
                          aria-hidden="true"
                          className="bg-rule h-px flex-1"
                        />
                      </li>
                    ) : null}
                    <GroupPlayedRow game={game} />
                  </React.Fragment>
                );
              })}
            </ul>
            {canLoadMore ? (
              <div className="mt-3 flex flex-col items-center gap-2">
                {loadMoreFailed ? (
                  <p className="text-body text-muted-foreground">
                    {m.webGroup.games.loadMoreFailed}
                  </p>
                ) : null}
                <Button
                  variant="outline"
                  disabled={loadingMore}
                  onClick={() => {
                    void loadMoreHistory();
                  }}
                >
                  {loadingMore ? m.common.loading : m.webGroup.games.loadMore}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
