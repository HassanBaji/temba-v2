"use client";

import { ActionMenu, ActionMenuItem } from "~/components/common/action-menu";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import { TournamentDetailRows } from "~/components/games/tournament-detail-rows";
import { TournamentHero } from "~/components/games/tournament-hero";
import { Button } from "~/components/ui/button";
import { friendlyGameCanKickPlayer } from "~/lib/friendly-game-players";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
  GROUP_ROW_LABEL,
  ORGANIZER_ROW_LABEL,
  PRICE_PER_MATCH_SUFFIX,
  PRICE_ROW_LABEL,
  TOURNAMENT_CLOSING_LINE,
  TOURNAMENT_EYEBROW_PREFIX,
  YOU_OWE_AFTER_EACH_MATCH,
  YOU_OWE_ROW_LABEL,
  tournamentEyebrow,
  tournamentFieldSummary,
  tournamentOrganizerName,
  tournamentSizeLine,
  tournamentStartLine,
  tournamentStatusLine,
  tournamentViewerSide,
} from "~/lib/tournament-home";
import { viewerTournamentTotalCents } from "~/lib/tournament-price";
import { sizeFriendlyTournament } from "~/lib/tournament-sizing";
import { type RouterOutputs } from "~/trpc/react";

type GameDetail = RouterOutputs["games"]["byId"];

export function TournamentHome({
  data,
  sharePending,
  joinPending,
  leavePending,
  kickPending,
  closePending,
  reopenPending,
  onShare,
  onInvite,
  onJoin,
  onJoinWaitlist,
  onLeaveGame,
  onLeaveWaitlist,
  onEdit,
  onCloseRegistration,
  onReopenRegistration,
  onCancelGame,
  onKick,
  onKickWaitlist,
}: {
  data: GameDetail;
  sharePending: boolean;
  joinPending: boolean;
  leavePending: boolean;
  kickPending: boolean;
  closePending: boolean;
  reopenPending: boolean;
  onShare?: () => void;
  onInvite?: () => void;
  onJoin?: () => void;
  onJoinWaitlist?: () => void;
  onLeaveGame?: () => void;
  onLeaveWaitlist?: () => void;
  onEdit?: () => void;
  onCloseRegistration?: () => void;
  onReopenRegistration?: () => void;
  onCancelGame?: () => void;
  onKick?: (userId: string) => void;
  onKickWaitlist?: (waitlistId: string) => void;
}) {
  const sizing =
    data.poolCount != null && data.teamsAllowed != null
      ? sizeFriendlyTournament(data.teamsAllowed, data.poolCount)
      : null;
  const field = tournamentFieldSummary(data.sides);
  const viewerSide = tournamentViewerSide(data.sides, data.viewerUserId);
  const seated = Boolean(viewerSide);
  const organizerName = tournamentOrganizerName({
    createdBy: data.createdBy,
    people: peopleFromGame(data),
  });
  const statusLine = tournamentStatusLine({
    seated,
    seatsLeft: field.seatTotal - field.seatsTaken,
    teamCount: data.teamsAllowed ?? data.sides.length,
    organizerName,
  });
  const matchesForViewer = matchesForViewerPool(data, sizing);
  const totalCents =
    seated && matchesForViewer != null
      ? viewerTournamentTotalCents(data.pricePerPlayerCents, matchesForViewer)
      : null;
  const detailRows = homeDetailRows({
    organizerName,
    groupName: data.groupName,
    pricePerPlayerCents: data.pricePerPlayerCents,
    seated,
    totalCents,
  });
  const drawn = data.drawPostedAt != null;
  const isOrganizerActive = data.isOrganizer && !data.cancelledAt;
  const canLeaveGame =
    (data.isSeated || data.isRegistered) && data.canLeave && !data.isWaitlisted;

  return (
    <div className="space-y-6">
      <TournamentHero
        name={data.name ?? "Tournament"}
        eyebrow={
          sizing?.ok
            ? tournamentEyebrow(sizing.sizing.roundCount)
            : TOURNAMENT_EYEBROW_PREFIX
        }
        startLine={tournamentStartLine(
          data.windowStart,
          data.venue?.name ?? null,
        )}
        sizeLine={sizing?.ok ? tournamentSizeLine(sizing.sizing) : null}
        statusLine={statusLine}
        viewerUserId={data.viewerUserId}
        left={viewerSide?.left ?? null}
        right={viewerSide?.right ?? null}
        showYourTeam={seated}
        backHref="/dashboard/games"
        onShare={onShare}
        sharePending={sharePending}
        onInvite={onInvite}
      />

      {drawn ? <TournamentStandingsTree /> : <TournamentPredrawTree />}

      <TournamentDetailRows rows={detailRows} />
      <p className="text-muted-foreground text-meta leading-relaxed">
        {TOURNAMENT_CLOSING_LINE}
      </p>

      <TournamentHomeActions
        canRegister={data.canRegister}
        canWaitlist={data.canWaitlist}
        isWaitlisted={data.isWaitlisted}
        canLeaveGame={canLeaveGame}
        isOrganizerActive={isOrganizerActive}
        registrationClosed={Boolean(data.registrationClosedAt)}
        joinFrozen={data.joinFrozen}
        joinPending={joinPending}
        leavePending={leavePending}
        closePending={closePending}
        reopenPending={reopenPending}
        kickPending={kickPending}
        kickableOccupants={kickableOccupants(data)}
        waitlist={data.waitlist}
        onJoin={onJoin}
        onJoinWaitlist={onJoinWaitlist}
        onLeaveGame={onLeaveGame}
        onLeaveWaitlist={onLeaveWaitlist}
        onEdit={onEdit}
        onCloseRegistration={onCloseRegistration}
        onReopenRegistration={onReopenRegistration}
        onCancelGame={onCancelGame}
        onKick={onKick}
        onKickWaitlist={onKickWaitlist}
      />

      <GameLevelRangePanel game={data} />
    </div>
  );
}

function TournamentPredrawTree() {
  return null;
}

function TournamentStandingsTree() {
  return null;
}

function TournamentHomeActions({
  canRegister,
  canWaitlist,
  isWaitlisted,
  canLeaveGame,
  isOrganizerActive,
  registrationClosed,
  joinFrozen,
  joinPending,
  leavePending,
  closePending,
  reopenPending,
  kickPending,
  kickableOccupants: kickable,
  waitlist,
  onJoin,
  onJoinWaitlist,
  onLeaveGame,
  onLeaveWaitlist,
  onEdit,
  onCloseRegistration,
  onReopenRegistration,
  onCancelGame,
  onKick,
  onKickWaitlist,
}: {
  canRegister: boolean;
  canWaitlist: boolean;
  isWaitlisted: boolean;
  canLeaveGame: boolean;
  isOrganizerActive: boolean;
  registrationClosed: boolean;
  joinFrozen: boolean;
  joinPending: boolean;
  leavePending: boolean;
  closePending: boolean;
  reopenPending: boolean;
  kickPending: boolean;
  kickableOccupants: { userId: string; name: string }[];
  waitlist: GameDetail["waitlist"];
  onJoin?: () => void;
  onJoinWaitlist?: () => void;
  onLeaveGame?: () => void;
  onLeaveWaitlist?: () => void;
  onEdit?: () => void;
  onCloseRegistration?: () => void;
  onReopenRegistration?: () => void;
  onCancelGame?: () => void;
  onKick?: (userId: string) => void;
  onKickWaitlist?: (waitlistId: string) => void;
}) {
  const showKick =
    isOrganizerActive && (kickable.length > 0 || waitlist.length > 0) && onKick;

  return (
    <div className="flex flex-col gap-2">
      {canRegister && onJoin ? (
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={joinPending}
          onClick={onJoin}
        >
          Join
        </Button>
      ) : null}
      {canWaitlist && onJoinWaitlist ? (
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={joinPending}
          onClick={onJoinWaitlist}
        >
          Join waitlist
        </Button>
      ) : null}
      {isWaitlisted && onLeaveWaitlist ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          disabled={leavePending}
          onClick={onLeaveWaitlist}
        >
          Leave waitlist
        </Button>
      ) : null}
      {canLeaveGame && onLeaveGame ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          disabled={leavePending}
          onClick={onLeaveGame}
        >
          Leave Game
        </Button>
      ) : null}
      {isOrganizerActive ? (
        <div className="flex flex-wrap gap-2">
          {onEdit ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={onEdit}
            >
              Edit Game
            </Button>
          ) : null}
          {registrationClosed ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={joinFrozen || reopenPending}
              onClick={onReopenRegistration}
            >
              Reopen registration
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={closePending}
              onClick={onCloseRegistration}
            >
              Close registration
            </Button>
          )}
          {showKick ? (
            <ActionMenu label="Kick a player">
              {kickable.map((occupant) => (
                <ActionMenuItem
                  key={occupant.userId}
                  variant="destructive"
                  disabled={kickPending}
                  onSelect={() => onKick?.(occupant.userId)}
                >
                  Kick {occupant.name}
                </ActionMenuItem>
              ))}
              {waitlist.map((entry) => (
                <ActionMenuItem
                  key={entry.id}
                  variant="destructive"
                  disabled={kickPending}
                  onSelect={() => onKickWaitlist?.(entry.id)}
                >
                  Kick {entry.name} from waitlist
                </ActionMenuItem>
              ))}
            </ActionMenu>
          ) : null}
          {onCancelGame ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive min-h-11"
              onClick={onCancelGame}
            >
              Cancel Game
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function peopleFromGame(data: GameDetail): { userId: string; name: string }[] {
  const people: { userId: string; name: string }[] = [];
  for (const row of data.sides) {
    if (row.left) {
      people.push({ userId: row.left.userId, name: row.left.name });
    }
    if (row.right) {
      people.push({ userId: row.right.userId, name: row.right.name });
    }
  }
  for (const player of data.registeredPlayers) {
    people.push({ userId: player.id, name: player.name });
  }
  for (const player of data.unseatedPlayers) {
    people.push({ userId: player.id, name: player.name });
  }
  for (const team of data.gameTeams) {
    for (const member of team.members) {
      people.push({ userId: member.id, name: member.name });
    }
  }
  return people;
}

function kickableOccupants(
  data: GameDetail,
): { userId: string; name: string }[] {
  const seen = new Set<string>();
  const occupants: { userId: string; name: string }[] = [];
  for (const row of data.sides) {
    for (const occupant of [row.left, row.right]) {
      if (!occupant || seen.has(occupant.userId)) {
        continue;
      }
      if (
        !friendlyGameCanKickPlayer({
          isOrganizer: data.isOrganizer,
          cancelled: Boolean(data.cancelledAt),
          isViewer: occupant.userId === data.viewerUserId,
        })
      ) {
        continue;
      }
      seen.add(occupant.userId);
      occupants.push({ userId: occupant.userId, name: occupant.name });
    }
  }
  return occupants;
}

function matchesForViewerPool(
  data: GameDetail,
  sizing: ReturnType<typeof sizeFriendlyTournament> | null,
): number | null {
  const tables = data.poolTables;
  if (tables?.viewerPoolIndex != null) {
    const pool = tables.pools.find(
      (item) => item.poolIndex === tables.viewerPoolIndex,
    );
    if (pool && pool.rows.length >= 2) {
      return pool.rows.length - 1;
    }
  }
  if (!sizing?.ok || sizing.sizing.uneven) {
    return null;
  }
  return sizing.sizing.matchesPerTeamMin;
}

function homeDetailRows(args: {
  organizerName: string | null;
  groupName: string | null;
  pricePerPlayerCents: number | null;
  seated: boolean;
  totalCents: number | null;
}) {
  const rows = [
    {
      label: ORGANIZER_ROW_LABEL,
      value: args.organizerName ?? "Organizer",
    },
    {
      label: GROUP_ROW_LABEL,
      value: args.groupName?.trim() ? args.groupName : "—",
    },
  ];
  const price = formatPricePerPlayerCents(args.pricePerPlayerCents);
  if (price) {
    rows.push({
      label: PRICE_ROW_LABEL,
      value: `${price} ${PRICE_PER_MATCH_SUFFIX}`,
    });
  }
  rows.push({
    label: COUNTS_FOR_RATING_LABEL,
    value: COUNTS_FOR_RATING_YES,
  });
  if (args.seated && args.totalCents != null) {
    const amount = formatPricePerPlayerCents(args.totalCents);
    if (amount) {
      rows.push({
        label: YOU_OWE_ROW_LABEL,
        value: `${amount}, ${YOU_OWE_AFTER_EACH_MATCH}`,
      });
    }
  }
  return rows;
}
