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
import {
  tournamentHomeView,
  tournamentStandingsView,
  type TournamentDetails,
  type TournamentStandingsView,
} from "@repo/domain/tournament-details";
import {
  kickableTournamentOccupants,
  tournamentOrganizerView,
} from "@repo/domain/tournament-organizer";
import {
  INVITE_ACTION_LABEL,
  LEAVE_THE_SEAT_LABEL,
  TOURNAMENT_CLOSING_LINE,
  type TournamentHomeJoinKind,
} from "@repo/domain/tournament-home";
import {
  KNOCKOUT_NOT_THROUGH_COPY,
  hasDraftKnockoutDraw,
  type KnockoutMatchPlace,
} from "@repo/domain/tournament-knockout-view";
import { hasDraftPoolDraw } from "@repo/domain/tournament-pool-draw";
import { type TournamentRoundScheduleEntry } from "@repo/domain/tournament-rounds";
import { cn } from "~/lib/utils";

type GameDetail = TournamentDetails;

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
  linkToPlayers = false,
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
  linkToPlayers?: boolean;
}) {
  const [mergeOpen, setMergeOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const backHref = detailBackHref(usePathname()) ?? "/dashboard/games";
  const view = tournamentHomeView(data);
  const { partnerRequired, joinKind, drawn, schedule } = view;
  const isOrganizerActive = data.isOrganizer && !data.cancelledAt;
  const organizer = tournamentOrganizerView(data, {
    drawn,
    partnerRequired,
  });
  const { halfTeams } = organizer;
  const showMergeBanner = organizer.merge === "banner";
  const showMergeEntry = organizer.merge === "entry";
  const showDrawEntry = organizer.showDrawEntry;
  const showUndo = organizer.showUndo;

  const canJoin = view.canJoin && Boolean(onJoin);
  const canJoinWaitlist = view.canWaitlist && Boolean(onJoinWaitlist);
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
          standings={tournamentStandingsView(data)}
          poolTables={data.poolTables}
          knockout={data.knockout}
          gameTeams={linkToPlayers ? data.gameTeams : undefined}
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
            name={view.hero.name}
            eyebrow={view.hero.eyebrow}
            startLine={view.hero.startLine}
            sizeLine={view.hero.sizeLine}
            statusLine={view.hero.statusLine}
            viewerUserId={data.viewerUserId}
            left={view.viewerSide?.left ?? null}
            right={view.viewerSide?.right ?? null}
            showYourTeam={view.seated}
            backHref={backHref}
            onShare={onShare}
            sharePending={sharePending}
            onInvite={onInvite}
          />
          <TournamentPredrawTree
            sides={data.sides}
            viewerUserId={data.viewerUserId}
            canTakeSeat={view.canTakeSeat}
            linkToPlayers={linkToPlayers}
            venueName={data.venue?.name ?? null}
            schedule={schedule}
            teamCount={data.teamsAllowed}
            completeTeams={view.field.full}
            gameTeams={data.gameTeams}
            storedRoundCount={data.roundCount}
            windowStart={data.windowStart}
            windowEnd={data.windowEnd}
            matchMinutes={data.matchMinutes}
            courtNames={data.recordedCourts.map((court) => court.name)}
            knockoutOnly={view.knockoutOnly}
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

      <TournamentDetailRows rows={view.detailRows} />
      {view.canLeaveGame && onLeaveGame ? (
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
        kickableOccupants={kickableTournamentOccupants(data)}
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
  linkToPlayers,
}: {
  sides: GameDetail["sides"];
  viewerUserId: string;
  canTakeSeat: boolean;
  linkToPlayers: boolean;
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
        linkToPlayers={linkToPlayers}
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
        linkToPlayers={linkToPlayers}
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
  standings,
  poolTables,
  knockout,
  gameTeams,
  backHref,
  showUndo,
  undoPending,
  undoError,
  onUndo,
  onCancelMatch,
}: {
  standings: TournamentStandingsView;
  poolTables: GameDetail["poolTables"];
  knockout: GameDetail["knockout"];
  gameTeams: GameDetail["gameTeams"] | undefined;
  backHref: string;
  showUndo: boolean;
  undoPending: boolean;
  undoError: { message: string; data?: { zodError?: unknown } | null } | null;
  onUndo: () => void | Promise<void>;
  onCancelMatch?: (place: KnockoutMatchPlace) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <TournamentStandingsHeader
          name={standings.name}
          roundsPlayed={standings.roundsPlayed}
          finished={standings.finished}
          backHref={backHref}
          heading={standings.heading}
          lead={standings.lead}
          championLine={standings.championLine}
        />
        {standings.showKnockoutTree && knockout ? (
          <div className="pt-[18px]">
            <TournamentKnockoutTree
              rounds={knockout}
              onCancelMatch={onCancelMatch}
              gameTeams={gameTeams}
            />
          </div>
        ) : null}
        {standings.showPoolTables && poolTables ? (
          <div className="pt-[18px]">
            <TournamentStandingsSection
              poolTables={poolTables}
              gameTeams={gameTeams}
            />
          </div>
        ) : null}
      </div>
      {standings.knockoutSectionTitle && knockout ? (
        <section aria-labelledby="tournament-knockout-heading">
          <h2
            id="tournament-knockout-heading"
            className="font-expanded text-h2 tracking-[-0.03em]"
          >
            {standings.knockoutSectionTitle}
          </h2>
          {standings.notThrough ? (
            <p className="text-muted-foreground text-meta mt-1 leading-relaxed">
              {KNOCKOUT_NOT_THROUGH_COPY}
            </p>
          ) : null}
          <div className="pt-[18px]">
            <TournamentKnockoutTree
              rounds={knockout}
              headingLevel="h3"
              onCancelMatch={onCancelMatch}
              gameTeams={gameTeams}
            />
          </div>
        </section>
      ) : null}
      {showUndo ? (
        <TournamentUndoPoolDraw
          knockoutOnly={standings.knockoutOnly}
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
