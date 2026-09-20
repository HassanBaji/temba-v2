"use client";

import { useState } from "react";

import { ActionMenu, ActionMenuItem } from "~/components/common/action-menu";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import { TournamentDetailRows } from "~/components/games/tournament-detail-rows";
import {
  TournamentDrawDrawer,
  TournamentDrawEntry,
  TournamentUndoPoolDraw,
} from "~/components/games/tournament-draw-drawer";
import { TournamentHero } from "~/components/games/tournament-hero";
import {
  TournamentMergeBanner,
  TournamentMergeDrawer,
  TournamentMergeEntry,
} from "~/components/games/tournament-merge-drawer";
import { TournamentSeatsGrid } from "~/components/games/tournament-seats-grid";
import { TournamentTeamsSection } from "~/components/games/tournament-teams-section";
import { TournamentYourRounds } from "~/components/games/tournament-your-rounds";
import { Button } from "~/components/ui/button";
import { friendlyGameCanKickPlayer } from "~/lib/friendly-game-players";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import {
  canOpenOrganizerMergeDrawer,
  halfTeamsFromSides,
  showOrganizerMergeBanner,
} from "~/lib/tournament-half-teams";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
  GROUP_ROW_LABEL,
  LEAVE_THE_SEAT_LABEL,
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
import {
  canOpenOrganizerDrawDrawer,
  canShowUndoPoolDraw,
  hasDraftPoolDraw,
} from "~/lib/tournament-pool-draw";
import { viewerTournamentTotalCents } from "~/lib/tournament-price";
import {
  tournamentRoundSchedule,
  type TournamentRoundScheduleEntry,
} from "~/lib/tournament-rounds";
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
  mergePending,
  mergeError,
  drawPending,
  drawError,
  postPending,
  postError,
  undoPending,
  undoError,
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
  onMerge,
  onDraw,
  onPost,
  onUndo,
}: {
  data: GameDetail;
  sharePending: boolean;
  joinPending: boolean;
  leavePending: boolean;
  kickPending: boolean;
  closePending: boolean;
  reopenPending: boolean;
  mergePending: boolean;
  mergeError: { message: string; data?: { zodError?: unknown } | null } | null;
  drawPending: boolean;
  drawError: { message: string; data?: { zodError?: unknown } | null } | null;
  postPending: boolean;
  postError: { message: string; data?: { zodError?: unknown } | null } | null;
  undoPending: boolean;
  undoError: { message: string; data?: { zodError?: unknown } | null } | null;
  onShare?: () => void;
  onInvite?: () => void;
  onJoin?: (seat?: { sideIndex: number; position: "left" | "right" }) => void;
  onJoinWaitlist?: () => void;
  onLeaveGame?: () => void;
  onLeaveWaitlist?: () => void;
  onEdit?: () => void;
  onCloseRegistration?: () => void;
  onReopenRegistration?: () => void;
  onCancelGame?: () => void;
  onKick?: (userId: string) => void;
  onKickWaitlist?: (waitlistId: string) => void;
  onMerge: (input: {
    firstGameTeamId: string;
    secondGameTeamId: string;
    firstPosition: "left" | "right";
    secondPosition: "left" | "right";
  }) => void | Promise<void>;
  onDraw: () => void | Promise<void>;
  onPost: () => void | Promise<void>;
  onUndo: () => void | Promise<void>;
}) {
  const [mergeOpen, setMergeOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
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
  const halfTeams = halfTeamsFromSides(data.sides);
  const mergeGate = {
    isOrganizer: data.isOrganizer,
    cancelled: Boolean(data.cancelledAt),
    drawPosted: drawn,
    halfTeamCount: halfTeams.length,
  };
  const showMergeBanner = showOrganizerMergeBanner(mergeGate);
  const showMergeEntry =
    canOpenOrganizerMergeDrawer(mergeGate) && !showMergeBanner;
  const drawGate = {
    isOrganizer: data.isOrganizer,
    cancelled: Boolean(data.cancelledAt),
    drawPosted: drawn,
  };
  const showDrawEntry = canOpenOrganizerDrawDrawer(drawGate);
  const showUndo = canShowUndoPoolDraw(drawGate);
  const canLeaveGame =
    (data.isSeated || data.isRegistered) && data.canLeave && !data.isWaitlisted;
  const schedule =
    sizing?.ok && data.windowStart && data.windowEnd
      ? tournamentRoundSchedule({
          windowStart: data.windowStart,
          windowEnd: data.windowEnd,
          roundCount: sizing.sizing.roundCount,
        })
      : [];

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

      {drawn ? (
        <TournamentStandingsTree
          showUndo={showUndo}
          undoPending={undoPending}
          undoError={undoError}
          onUndo={onUndo}
        />
      ) : (
        <TournamentPredrawTree
          sides={data.sides}
          viewerUserId={data.viewerUserId}
          canTakeSeat={data.canRegister && !seated}
          venueName={data.venue?.name ?? null}
          schedule={schedule}
          teamCount={data.teamsAllowed}
          completeTeams={field.full}
          gameTeams={data.gameTeams}
          poolCount={data.poolCount}
          windowStart={data.windowStart}
          windowEnd={data.windowEnd}
          courtNames={data.recordedCourts.map((court) => court.name)}
          showMergeBanner={showMergeBanner}
          showMergeEntry={showMergeEntry}
          showDrawEntry={showDrawEntry}
          halfTeamCount={halfTeams.length}
          mergeOpen={mergeOpen}
          mergePending={mergePending}
          mergeError={mergeError}
          drawOpen={drawOpen}
          drawPending={drawPending}
          drawError={drawError}
          postPending={postPending}
          postError={postError}
          onOpenMerge={() => setMergeOpen(true)}
          onMergeOpenChange={setMergeOpen}
          onMerge={onMerge}
          onOpenDraw={() => setDrawOpen(true)}
          onDrawOpenChange={setDrawOpen}
          onDraw={onDraw}
          onPost={onPost}
          onTakeSeat={
            onJoin
              ? (seat) => {
                  onJoin(seat);
                }
              : undefined
          }
          onInvite={onInvite}
        />
      )}

      <TournamentDetailRows rows={detailRows} />
      {canLeaveGame && onLeaveGame ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          disabled={leavePending}
          onClick={onLeaveGame}
        >
          {LEAVE_THE_SEAT_LABEL}
        </Button>
      ) : null}
      <p className="text-muted-foreground text-meta leading-relaxed">
        {TOURNAMENT_CLOSING_LINE}
      </p>

      <TournamentHomeActions
        canRegister={data.canRegister}
        canWaitlist={data.canWaitlist}
        isWaitlisted={data.isWaitlisted}
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

function TournamentPredrawTree({
  sides,
  viewerUserId,
  canTakeSeat,
  venueName,
  schedule,
  teamCount,
  completeTeams,
  gameTeams,
  poolCount,
  windowStart,
  windowEnd,
  courtNames,
  showMergeBanner,
  showMergeEntry,
  showDrawEntry,
  halfTeamCount,
  mergeOpen,
  mergePending,
  mergeError,
  drawOpen,
  drawPending,
  drawError,
  postPending,
  postError,
  onOpenMerge,
  onMergeOpenChange,
  onMerge,
  onOpenDraw,
  onDrawOpenChange,
  onDraw,
  onPost,
  onTakeSeat,
  onInvite,
}: {
  sides: GameDetail["sides"];
  viewerUserId: string;
  canTakeSeat: boolean;
  venueName: string | null;
  schedule: TournamentRoundScheduleEntry[];
  teamCount: number | null;
  completeTeams: number;
  gameTeams: GameDetail["gameTeams"];
  poolCount: number | null;
  windowStart: Date | string | null;
  windowEnd: Date | string | null;
  courtNames: readonly string[];
  showMergeBanner: boolean;
  showMergeEntry: boolean;
  showDrawEntry: boolean;
  halfTeamCount: number;
  mergeOpen: boolean;
  mergePending: boolean;
  mergeError: { message: string; data?: { zodError?: unknown } | null } | null;
  drawOpen: boolean;
  drawPending: boolean;
  drawError: { message: string; data?: { zodError?: unknown } | null } | null;
  postPending: boolean;
  postError: { message: string; data?: { zodError?: unknown } | null } | null;
  onOpenMerge: () => void;
  onMergeOpenChange: (open: boolean) => void;
  onMerge: (input: {
    firstGameTeamId: string;
    secondGameTeamId: string;
    firstPosition: "left" | "right";
    secondPosition: "left" | "right";
  }) => void | Promise<void>;
  onOpenDraw: () => void;
  onDrawOpenChange: (open: boolean) => void;
  onDraw: () => void | Promise<void>;
  onPost: () => void | Promise<void>;
  onTakeSeat?: (seat: {
    sideIndex: number;
    position: "left" | "right";
  }) => void;
  onInvite?: () => void;
}) {
  const fieldSize = teamCount ?? sides.length;
  return (
    <div className="space-y-6">
      {showMergeBanner ? (
        <TournamentMergeBanner
          sides={sides}
          teamCount={teamCount}
          onOpen={onOpenMerge}
        />
      ) : null}
      {showMergeEntry ? (
        <TournamentMergeEntry
          halfTeamCount={halfTeamCount}
          onOpen={onOpenMerge}
        />
      ) : null}
      {showDrawEntry ? (
        <TournamentDrawEntry
          completeTeams={completeTeams}
          teamCount={fieldSize}
          hasDraft={hasDraftPoolDraw(gameTeams)}
          onOpen={onOpenDraw}
        />
      ) : null}
      <TournamentMergeDrawer
        open={mergeOpen}
        onOpenChange={onMergeOpenChange}
        sides={sides}
        teamCount={teamCount}
        mergePending={mergePending}
        mergeError={mergeError}
        onMerge={onMerge}
      />
      <TournamentDrawDrawer
        open={drawOpen}
        onOpenChange={onDrawOpenChange}
        gameTeams={gameTeams}
        poolCount={poolCount}
        teamCount={fieldSize}
        windowStart={windowStart}
        windowEnd={windowEnd}
        courtNames={courtNames}
        drawPending={drawPending}
        drawError={drawError}
        onDraw={onDraw}
        postPending={postPending}
        postError={postError}
        onPost={onPost}
      />
      <TournamentTeamsSection
        sides={sides}
        viewerUserId={viewerUserId}
        canTakeSeat={canTakeSeat}
        onTakeSeat={onTakeSeat}
      />
      <TournamentSeatsGrid sides={sides} onInvite={onInvite} />
      <TournamentYourRounds
        mode="schedule"
        venueName={venueName}
        rounds={schedule}
      />
    </div>
  );
}

function TournamentStandingsTree({
  showUndo,
  undoPending,
  undoError,
  onUndo,
}: {
  showUndo: boolean;
  undoPending: boolean;
  undoError: { message: string; data?: { zodError?: unknown } | null } | null;
  onUndo: () => void | Promise<void>;
}) {
  if (!showUndo) {
    return null;
  }
  return (
    <TournamentUndoPoolDraw
      undoPending={undoPending}
      undoError={undoError}
      onUndo={onUndo}
    />
  );
}

function TournamentHomeActions({
  canRegister,
  canWaitlist,
  isWaitlisted,
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
  onJoin?: (seat?: { sideIndex: number; position: "left" | "right" }) => void;
  onJoinWaitlist?: () => void;
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
          onClick={() => onJoin()}
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
