"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import { FooterAction } from "~/components/games/friendly-game-actions-footer";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import { TournamentDetailRows } from "~/components/games/tournament-detail-rows";
import {
  TournamentDrawDrawer,
  TournamentDrawEntry,
  TournamentUndoPoolDraw,
} from "~/components/games/tournament-draw-drawer";
import { TournamentHero } from "~/components/games/tournament-hero";
import { TournamentKnockoutTree } from "~/components/games/tournament-knockout-tree";
import {
  TournamentMergeBanner,
  TournamentMergeDrawer,
  TournamentMergeEntry,
} from "~/components/games/tournament-merge-drawer";
import { TournamentSeatsGrid } from "~/components/games/tournament-seats-grid";
import {
  TournamentStandingsHeader,
  TournamentStandingsSection,
} from "~/components/games/tournament-standings-section";
import { TournamentTeamsSection } from "~/components/games/tournament-teams-section";
import { TournamentYourRounds } from "~/components/games/tournament-your-rounds";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { detailBackHref } from "~/lib/dashboard-paths";
import {
  CANCEL_GAME_ACTION,
  EDIT_GAME_ACTION,
  REGISTER_TEAM_ACTION,
} from "@repo/domain/game-copy";
import { friendlyGameCanKickPlayer } from "~/lib/friendly-game-players";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import {
  canOpenOrganizerMergeDrawer,
  halfTeamsFromSides,
  showOrganizerMergeBanner,
} from "~/lib/tournament-half-teams";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
  GROUP_ROW_LABEL,
  GROUPS_THEN_KNOCKOUT_LEAD,
  INVITE_ACTION_LABEL,
  KNOCKOUT_ONLY_LEAD,
  LEAVE_THE_SEAT_LABEL,
  ORGANIZER_ROW_LABEL,
  PRICE_PER_MATCH_SUFFIX,
  PRICE_ROW_LABEL,
  TOURNAMENT_CLOSING_LINE,
  TOURNAMENT_EYEBROW_PREFIX,
  YOU_OWE_AFTER_EACH_MATCH,
  YOU_OWE_ROW_LABEL,
  drawnTournamentProgressLine,
  isTournamentStandingsView,
  knockoutSizeLine,
  tournamentEyebrow,
  tournamentFieldSummary,
  tournamentOrganizerName,
  tournamentRoundCount,
  tournamentSizeLine,
  tournamentStartLine,
  tournamentStatusLine,
  tournamentViewerSide,
  tournamentHomeJoinKind,
  type TournamentHomeJoinKind,
} from "@repo/domain/tournament-home";
import { tournamentShowsTakeSeat } from "@repo/domain/tournament-join";
import {
  KNOCKOUT_HEADING,
  KNOCKOUT_NOT_THROUGH_COPY,
  hasDraftKnockoutDraw,
  knockoutChampion,
  knockoutChampionLine,
  viewerMissedKnockout,
  type KnockoutMatchPlace,
} from "@repo/domain/tournament-knockout-view";
import {
  canOpenOrganizerDrawDrawer,
  canShowUndoPoolDraw,
  hasDraftPoolDraw,
} from "@repo/domain/tournament-pool-draw";
import {
  viewerTournamentMatchCount,
  viewerTournamentTotalFils,
} from "~/lib/tournament-price";
import {
  hasKnockout,
  isKnockoutOnly,
  isPartnerRequiredGame,
  plannedKnockoutRoundCount,
  roundsPlayedLabel,
  tournamentRoundSchedule,
  type TournamentRoundScheduleEntry,
} from "@repo/domain/tournament-rounds";
import {
  EACH_MATCH_ROW_LABEL,
  sizeFriendlyTournament,
  tournamentMatchMinutes,
} from "@repo/domain/tournament-sizing";
import { cn } from "~/lib/utils";
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
  teamId,
  onTeamIdChange,
  onRegisterTeam,
  registerTeamPending,
  onMerge,
  onDraw,
  onPost,
  onUndo,
  onCancelKnockoutMatch,
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
  teamId: string;
  onTeamIdChange: (teamId: string) => void;
  onRegisterTeam: (teamId: string) => void;
  registerTeamPending: boolean;
  onMerge: (input: {
    firstGameTeamId: string;
    secondGameTeamId: string;
    firstPosition: "left" | "right";
    secondPosition: "left" | "right";
  }) => void | Promise<void>;
  onDraw: () => void | Promise<void>;
  onPost: () => void | Promise<void>;
  onUndo: () => void | Promise<void>;
  onCancelKnockoutMatch?: (place: KnockoutMatchPlace) => void;
}) {
  const [mergeOpen, setMergeOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const backHref = detailBackHref(usePathname()) ?? "/dashboard/games";
  const knockoutOnly = isKnockoutOnly(data.format, data.tournamentShape);
  const thenKnockout =
    !knockoutOnly && hasKnockout(data.format, data.tournamentShape);
  const sizing =
    data.poolCount != null && data.teamsAllowed != null
      ? sizeFriendlyTournament(data.teamsAllowed, data.poolCount)
      : null;
  const roundCount = tournamentRoundCount(data);
  const field = tournamentFieldSummary(data.sides);
  const viewerSide = tournamentViewerSide(data.sides, data.viewerUserId);
  const seated = Boolean(viewerSide);
  const partnerRequired = isPartnerRequiredGame(data);
  const joinKind = tournamentHomeJoinKind(
    data.registrationMode,
    data.canRegister,
  );
  const organizerName = tournamentOrganizerName({
    createdBy: data.createdBy,
    people: peopleFromGame(data),
  });
  const statusLine = tournamentStatusLine({
    seated,
    seatsLeft:
      Math.max(field.seatTotal, data.playersAllowed ?? 0) - field.seatsTaken,
    teamCount: data.teamsAllowed ?? data.sides.length,
    organizerName,
    knockoutOnly,
    thenKnockout,
  });
  const matchesForViewer = viewerTournamentMatchCount(data);
  const totalFils =
    seated && matchesForViewer != null
      ? viewerTournamentTotalFils(data.pricePerPlayerFils, matchesForViewer)
      : null;
  const detailRows = homeDetailRows({
    organizerName,
    groupName: data.groupName,
    matchMinutes: data.matchMinutes,
    pricePerPlayerFils: data.pricePerPlayerFils,
    seated,
    totalFils,
  });
  const drawn = isTournamentStandingsView(data.drawPostedAt);
  const isOrganizerActive = data.isOrganizer && !data.cancelledAt;
  const halfTeams = halfTeamsFromSides(data.sides);
  const mergeGate = {
    isOrganizer: data.isOrganizer,
    cancelled: Boolean(data.cancelledAt),
    drawPosted: drawn,
    halfTeamCount: halfTeams.length,
    partnerRequired,
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
  const showUndo = canShowUndoPoolDraw({
    ...drawGate,
    canUndo: data.canUndoDraw,
  });
  const canLeaveGame =
    (data.isSeated || data.isRegistered) && data.canLeave && !data.isWaitlisted;
  const schedule =
    roundCount != null && data.windowStart && data.windowEnd
      ? tournamentRoundSchedule({
          windowStart: data.windowStart,
          windowEnd: data.windowEnd,
          roundCount,
          matchMinutes: data.matchMinutes,
        })
      : [];

  const canJoin = joinKind === "join" && Boolean(onJoin);
  const canWaitlist =
    data.canWaitlist && joinKind === "join" && !partnerRequired;
  const canJoinWaitlist = canWaitlist && Boolean(onJoinWaitlist);
  const showJoinBar = canJoin || canJoinWaitlist;

  return (
    <div
      className={cn(
        "space-y-6",
        showJoinBar && "max-lg:pb-20",
        canJoin && canJoinWaitlist && "max-lg:pb-36",
      )}
    >
      {drawn ? (
        <TournamentStandingsTree
          name={data.name ?? "Tournament"}
          roundsPlayed={drawnTournamentProgressLine({
            roundsPlayed: roundsPlayedLabel(data.poolTables, roundCount),
            knockout: data.knockout,
          })}
          poolTables={data.poolTables}
          knockoutOnly={knockoutOnly}
          groupsThenKnockout={thenKnockout}
          knockout={data.knockout}
          backHref={backHref}
          showUndo={showUndo}
          undoPending={undoPending}
          undoError={undoError}
          onUndo={onUndo}
          onCancelMatch={isOrganizerActive ? onCancelKnockoutMatch : undefined}
        />
      ) : (
        <>
          <TournamentHero
            name={data.name ?? "Tournament"}
            eyebrow={
              roundCount != null
                ? tournamentEyebrow(roundCount, knockoutOnly)
                : TOURNAMENT_EYEBROW_PREFIX
            }
            startLine={tournamentStartLine(
              data.windowStart,
              data.venue?.name ?? null,
            )}
            sizeLine={
              knockoutOnly
                ? knockoutSizeLine(data.teamsAllowed ?? data.sides.length)
                : sizing?.ok
                  ? tournamentSizeLine(
                      sizing.sizing,
                      plannedKnockoutRoundCount(data),
                    )
                  : null
            }
            statusLine={statusLine}
            viewerUserId={data.viewerUserId}
            left={viewerSide?.left ?? null}
            right={viewerSide?.right ?? null}
            showYourTeam={seated}
            backHref={backHref}
            onShare={onShare}
            sharePending={sharePending}
            onInvite={onInvite}
          />
          <TournamentPredrawTree
            sides={data.sides}
            viewerUserId={data.viewerUserId}
            canTakeSeat={tournamentShowsTakeSeat({
              canJoin: joinKind === "join",
              seated,
              partnerRequired,
            })}
            venueName={data.venue?.name ?? null}
            schedule={schedule}
            teamCount={data.teamsAllowed}
            completeTeams={field.full}
            gameTeams={data.gameTeams}
            storedRoundCount={data.roundCount}
            windowStart={data.windowStart}
            windowEnd={data.windowEnd}
            matchMinutes={data.matchMinutes}
            courtNames={data.recordedCourts.map((court) => court.name)}
            knockoutOnly={knockoutOnly}
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
        </>
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
        joinKind={joinKind}
        isWaitlisted={data.isWaitlisted}
        isOrganizerActive={isOrganizerActive}
        onInvite={drawn ? onInvite : undefined}
        onShare={drawn ? onShare : undefined}
        sharePending={sharePending}
        registrationClosed={Boolean(data.registrationClosedAt)}
        joinFrozen={data.joinFrozen}
        leavePending={leavePending}
        closePending={closePending}
        reopenPending={reopenPending}
        kickPending={kickPending}
        kickableOccupants={kickableOccupants(data)}
        waitlist={data.waitlist}
        eligibleTeams={data.eligibleTeams}
        teamId={teamId}
        onTeamIdChange={onTeamIdChange}
        onRegisterTeam={onRegisterTeam}
        registerTeamPending={registerTeamPending}
        onLeaveWaitlist={onLeaveWaitlist}
        onEdit={onEdit}
        onCloseRegistration={onCloseRegistration}
        onReopenRegistration={onReopenRegistration}
        onCancelGame={onCancelGame}
        onKick={onKick}
        onKickWaitlist={onKickWaitlist}
      />

      <GameLevelRangePanel game={data} />

      {showJoinBar ? (
        <TournamentJoinBar
          pending={joinPending}
          onJoin={canJoin && onJoin ? () => onJoin() : undefined}
          onJoinWaitlist={canJoinWaitlist ? onJoinWaitlist : undefined}
        />
      ) : null}
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
  storedRoundCount,
  windowStart,
  windowEnd,
  matchMinutes,
  courtNames,
  knockoutOnly,
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
  storedRoundCount: number | null;
  windowStart: Date | string | null;
  windowEnd: Date | string | null;
  matchMinutes: number | null;
  courtNames: readonly string[];
  knockoutOnly: boolean;
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
          hasDraft={
            knockoutOnly
              ? hasDraftKnockoutDraw(gameTeams)
              : hasDraftPoolDraw(gameTeams)
          }
          knockoutOnly={knockoutOnly}
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
        knockoutOnly={knockoutOnly}
      />
      <TournamentDrawDrawer
        open={drawOpen}
        onOpenChange={onDrawOpenChange}
        knockoutOnly={knockoutOnly}
        viewerUserId={viewerUserId}
        gameTeams={gameTeams}
        teamCount={fieldSize}
        completeTeams={completeTeams}
        storedRoundCount={storedRoundCount}
        windowStart={windowStart}
        windowEnd={windowEnd}
        matchMinutes={matchMinutes}
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
  name,
  roundsPlayed,
  poolTables,
  knockoutOnly,
  groupsThenKnockout,
  knockout,
  backHref,
  showUndo,
  undoPending,
  undoError,
  onUndo,
  onCancelMatch,
}: {
  name: string;
  roundsPlayed: string | null;
  poolTables: GameDetail["poolTables"];
  knockoutOnly: boolean;
  groupsThenKnockout: boolean;
  knockout: GameDetail["knockout"];
  backHref: string;
  showUndo: boolean;
  undoPending: boolean;
  undoError: { message: string; data?: { zodError?: unknown } | null } | null;
  onUndo: () => void | Promise<void>;
  onCancelMatch?: (place: KnockoutMatchPlace) => void;
}) {
  const champion = knockoutChampion(knockout);
  const notThrough =
    groupsThenKnockout &&
    viewerMissedKnockout({
      rounds: knockout,
      poolStageFinished: Boolean(poolTables?.finished),
      viewerHasTeam: poolTables?.viewerPoolIndex != null,
    });
  return (
    <div className="space-y-6">
      <div>
        <TournamentStandingsHeader
          name={name}
          roundsPlayed={roundsPlayed}
          finished={!groupsThenKnockout && Boolean(poolTables?.finished)}
          backHref={backHref}
          {...(knockoutOnly
            ? { heading: KNOCKOUT_HEADING, lead: KNOCKOUT_ONLY_LEAD }
            : groupsThenKnockout
              ? { lead: GROUPS_THEN_KNOCKOUT_LEAD }
              : {})}
          championLine={champion ? knockoutChampionLine(champion) : null}
        />
        {knockoutOnly ? (
          knockout ? (
            <div className="pt-[18px]">
              <TournamentKnockoutTree
                rounds={knockout}
                onCancelMatch={onCancelMatch}
              />
            </div>
          ) : null
        ) : poolTables ? (
          <div className="pt-[18px]">
            <TournamentStandingsSection poolTables={poolTables} />
          </div>
        ) : null}
      </div>
      {groupsThenKnockout && knockout ? (
        <section aria-labelledby="tournament-knockout-heading">
          <h2
            id="tournament-knockout-heading"
            className="font-expanded text-h2 tracking-[-0.03em]"
          >
            {KNOCKOUT_HEADING}
          </h2>
          {notThrough ? (
            <p className="text-muted-foreground text-meta mt-1 leading-relaxed">
              {KNOCKOUT_NOT_THROUGH_COPY}
            </p>
          ) : null}
          <div className="pt-[18px]">
            <TournamentKnockoutTree
              rounds={knockout}
              headingLevel="h3"
              onCancelMatch={onCancelMatch}
            />
          </div>
        </section>
      ) : null}
      {showUndo ? (
        <TournamentUndoPoolDraw
          knockoutOnly={knockoutOnly}
          undoPending={undoPending}
          undoError={undoError}
          onUndo={onUndo}
        />
      ) : null}
    </div>
  );
}

function TournamentJoinBar({
  pending,
  onJoin,
  onJoinWaitlist,
}: {
  pending: boolean;
  onJoin?: () => void;
  onJoinWaitlist?: () => void;
}) {
  return (
    <div
      data-slot="tournament-join-bar"
      className={cn(
        "bg-background border-border flex flex-col gap-2 max-lg:border-t max-lg:px-4 max-lg:py-3 max-lg:pb-6",
        "max-lg:fixed max-lg:inset-x-0 max-lg:z-40",
        "lg:sticky lg:z-10 lg:py-4",
      )}
      style={{
        bottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {onJoin ? (
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={pending}
          onClick={onJoin}
        >
          Join
        </Button>
      ) : null}
      {onJoinWaitlist ? (
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={pending}
          onClick={onJoinWaitlist}
        >
          Join waitlist
        </Button>
      ) : null}
    </div>
  );
}

function TournamentHomeActions({
  joinKind,
  isWaitlisted,
  isOrganizerActive,
  registrationClosed,
  joinFrozen,
  leavePending,
  closePending,
  reopenPending,
  kickPending,
  sharePending,
  kickableOccupants: kickable,
  waitlist,
  eligibleTeams,
  teamId,
  onTeamIdChange,
  onRegisterTeam,
  registerTeamPending,
  onLeaveWaitlist,
  onEdit,
  onCloseRegistration,
  onReopenRegistration,
  onCancelGame,
  onKick,
  onKickWaitlist,
  onInvite,
  onShare,
}: {
  joinKind: TournamentHomeJoinKind | null;
  isWaitlisted: boolean;
  isOrganizerActive: boolean;
  registrationClosed: boolean;
  joinFrozen: boolean;
  leavePending: boolean;
  closePending: boolean;
  reopenPending: boolean;
  kickPending: boolean;
  sharePending?: boolean;
  kickableOccupants: { userId: string; name: string }[];
  waitlist: GameDetail["waitlist"];
  eligibleTeams: GameDetail["eligibleTeams"];
  teamId: string;
  onTeamIdChange: (teamId: string) => void;
  onRegisterTeam: (teamId: string) => void;
  registerTeamPending: boolean;
  onLeaveWaitlist?: () => void;
  onEdit?: () => void;
  onCloseRegistration?: () => void;
  onReopenRegistration?: () => void;
  onCancelGame?: () => void;
  onKick?: (userId: string) => void;
  onKickWaitlist?: (waitlistId: string) => void;
  onInvite?: () => void;
  onShare?: () => void;
}) {
  const showKick =
    isOrganizerActive && (kickable.length > 0 || waitlist.length > 0) && onKick;

  return (
    <div className="flex flex-col gap-2">
      {joinKind === "register_team" ? (
        eligibleTeams.length === 0 ? (
          <p className="text-muted-foreground text-meta leading-relaxed">
            You need a complete Team whose both partners are allowed on this
            Game.
          </p>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (teamId.length === 0) {
                return;
              }
              onRegisterTeam(teamId);
            }}
          >
            {eligibleTeams.length > 1 ? (
              <Field>
                <FieldLabel htmlFor="tournament-team-id">Team</FieldLabel>
                <Select value={teamId} onValueChange={onTeamIdChange}>
                  <SelectTrigger id="tournament-team-id">
                    <SelectValue placeholder="Select a Team" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.memberNames.join(" / ")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Button
              type="submit"
              className="min-h-11 w-full"
              disabled={registerTeamPending || teamId.length === 0}
            >
              {registerTeamPending ? "Registering…" : REGISTER_TEAM_ACTION}
            </Button>
          </form>
        )
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
        <>
          <div className="flex items-center gap-2">
            {onInvite ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1"
                onClick={onInvite}
              >
                {INVITE_ACTION_LABEL}
              </Button>
            ) : null}
            <div className="ml-auto">
              <ActionMenu label="Game actions">
                {onShare ? (
                  <ActionMenuItem disabled={sharePending} onSelect={onShare}>
                    Share
                  </ActionMenuItem>
                ) : null}
                {registrationClosed ? (
                  <ActionMenuItem
                    disabled={joinFrozen || reopenPending}
                    onSelect={onReopenRegistration}
                  >
                    Reopen registration
                  </ActionMenuItem>
                ) : (
                  <ActionMenuItem
                    disabled={closePending}
                    onSelect={onCloseRegistration}
                  >
                    Close registration
                  </ActionMenuItem>
                )}
                {showKick ? (
                  <>
                    <ActionMenuSeparator />
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
                        Kick {entry.name} from the waitlist
                      </ActionMenuItem>
                    ))}
                  </>
                ) : null}
              </ActionMenu>
            </div>
          </div>
          {onEdit || onCancelGame ? (
            <div
              data-slot="tournament-actions-footer"
              className="border-rule divide-rule divide-y border-t"
            >
              {onEdit ? (
                <FooterAction label={EDIT_GAME_ACTION} onClick={onEdit} />
              ) : null}
              {onCancelGame ? (
                <FooterAction
                  label={CANCEL_GAME_ACTION}
                  onClick={onCancelGame}
                />
              ) : null}
            </div>
          ) : null}
        </>
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

function homeDetailRows(args: {
  organizerName: string | null;
  groupName: string | null;
  matchMinutes: number | null;
  pricePerPlayerFils: number | null;
  seated: boolean;
  totalFils: number | null;
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
    {
      label: EACH_MATCH_ROW_LABEL,
      value: `${tournamentMatchMinutes(args.matchMinutes)} min`,
    },
  ];
  const price = formatPricePerPlayerFils(args.pricePerPlayerFils);
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
  if (args.seated && args.totalFils != null) {
    const amount = formatPricePerPlayerFils(args.totalFils);
    if (amount) {
      rows.push({
        label: YOU_OWE_ROW_LABEL,
        value: `${amount}, ${YOU_OWE_AFTER_EACH_MATCH}`,
      });
    }
  }
  return rows;
}
