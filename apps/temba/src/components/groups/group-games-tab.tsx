"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { GameSummaryCard } from "~/components/games/game-summary-card";
import { GroupPlayedRow } from "~/components/groups/group-played-row";
import { Button } from "~/components/ui/button";
import { offersPartnerJoin } from "~/lib/friendly-game-partner";
import {
  gameSummaryPrimaryAction,
  gameViewerStatus,
  showsFriendlyRoster,
  showsGameCardPartnerFooter,
} from "~/lib/game-summary-cta";
import { type RouterOutputs } from "~/trpc/react";

type GroupHome = RouterOutputs["groups"]["byId"];
type ScheduledGame = GroupHome["upcomingGames"][number];

const CARD = "border-rule overflow-hidden rounded-[14px] border";
const HEADING = "font-expanded pb-2.5 text-[19px] leading-tight";

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
  const hasAny = upcomingGames.length > 0 || gameHistory.length > 0;
  const createFirstGame = canShowCreateGame ? (
    <Button asChild variant="outline">
      <Link href={`/dashboard/games/new?groupId=${groupId}`}>
        Create the first game
      </Link>
    </Button>
  ) : null;
  const archiveCopy =
    "Existing Games stay listed here, not on public pickup. Join, waitlist, and Game invites are closed while the Community is Soft-archived.";

  if (!hasAny) {
    return (
      <EmptyState
        icon={Calendar}
        title="No Games yet"
        description={
          isCommunityArchived
            ? archiveCopy
            : "When a Game is set with a live window or Match, it will show up here."
        }
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
            {archiveCopy}
          </p>
        ) : null}
        {upcomingGames.length === 0 ? (
          <p className="text-body text-muted-foreground">
            No upcoming Games scheduled for this Group.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcomingGames.map((game) => {
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
                  pricePerPlayerCents={game.pricePerPlayerCents}
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
        {gameHistory.length === 0 ? (
          <p className="text-body text-muted-foreground">
            No Game history yet.
          </p>
        ) : (
          <ul className={CARD}>
            {gameHistory.map((game) => (
              <GroupPlayedRow key={game.id} game={game} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
