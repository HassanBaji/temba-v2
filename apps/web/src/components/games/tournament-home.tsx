"use client";

import {
  ArrowLeftRight,
  Ban,
  RotateCcwIcon,
  LockIcon,
  LockOpenIcon,
  PencilIcon,
  Share2Icon,
  UserMinusIcon,
  UserPlusIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ComponentProps, type ReactNode } from "react";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import {
  ACTION_MENU_INK_BOXED_TRIGGER,
  ACTION_MENU_PAPER_BOXED_TRIGGER,
} from "~/components/common/action-menu";
import { GameAlbumSections } from "~/components/game-album/game-album-sections";
import {
  GameActionsSheet,
  type GameActionsSheetRow,
} from "~/components/games/game-actions-sheet";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import { TournamentDetailRows } from "~/components/games/tournament-detail-rows";
import { TournamentDrawnHome } from "~/components/games/tournament-drawn-home";
import {
  TournamentDrawDrawer,
  TournamentDrawEntry,
  TournamentUndoPoolDraw,
} from "~/components/games/tournament-draw-drawer";
import {
  FinishedShareLink,
  TournamentFinishedHeader,
} from "~/components/games/tournament-finished-parts";
import { TournamentHero } from "~/components/games/tournament-hero";
import { TournamentKingHome } from "~/components/games/tournament-king-home";
import {
  KingDrawEntry,
  KingDrawSheet,
  KingHowItRuns,
  type KingActions,
} from "~/components/games/tournament-king-parts";
import {
  useMatchStamping,
  type MatchStamping,
} from "~/components/games/match-stamp";
import { TournamentKnockoutTree } from "~/components/games/tournament-knockout-tree";
import { TournamentPlayerActionsProvider } from "~/components/games/tournament-player-dialog";
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
import { useLocale, useMessages } from "~/components/locale-provider";
import { detailBackHref } from "~/lib/dashboard-paths";
import {
  tournamentHomeView,
  tournamentStandingsView,
  type TournamentDetails,
  type TournamentStandingsView,
} from "@repo/domain/tournament-details";
import {
  tournamentFinishedView,
  type TournamentFinishedView,
} from "@repo/domain/tournament-finished";
import {
  kickableTournamentOccupants,
  tournamentOrganizerView,
} from "@repo/domain/tournament-organizer";
import { type TournamentHomeJoinKind } from "@repo/domain/tournament-home";
import { playedDateLine, playedVenueLine } from "@repo/domain/played-game";
import {
  hasDraftKnockoutDraw,
  type KnockoutMatchPlace,
} from "@repo/domain/tournament-knockout-view";
import { hasDraftPoolDraw } from "@repo/domain/tournament-pool-draw";
import { kingCourtCount } from "@repo/domain/tournament-king";
import { type TournamentRoundScheduleEntry } from "@repo/domain/tournament-rounds";
import { cn } from "~/lib/utils";

type GameDetail = TournamentDetails;

type OpenSeatHandler = (
  seat: { sideIndex: number; position: "left" | "right" },
  canJoin: boolean,
) => void;

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
  onAddPlayer,
  onEditTeams,
  onOpenSeat,
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
  roundsPreview,
  kingActions,
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
  onAddPlayer?: () => void;
  onEditTeams?: () => void;
  /** The Organizer clicked an open seat; `canJoin` when they could take it too. */
  onOpenSeat?: OpenSeatHandler;
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
  roundsPreview?: ComponentProps<typeof TournamentDrawnHome>["preview"];
  /** The King of the court posts: the starting courts and the final order. */
  kingActions: KingActions;
}) {
  const m = useMessages();
  const locale = useLocale();
  const [mergeOpen, setMergeOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const backHref = detailBackHref(usePathname()) ?? "/dashboard/games";
  const view = tournamentHomeView(data, locale);
  const stamping = useMatchStamping(data);
  const { partnerRequired, joinKind, drawn, schedule } = view;
  const finished = tournamentFinishedView(data, locale);
  const album = drawn ? (
    <GameAlbumSections
      gameId={data.id}
      enabled={roundsPreview == null}
      place={playedVenueLine({ ...data, courtName: null }, locale) ?? ""}
      context={playedDateLine(data.windowStart, locale)}
    />
  ) : null;
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

  const king = view.kingOfTheCourt;
  const roundsAsYouGo = drawn && !view.knockoutOnly && !king;
  const canJoin = view.canJoin && Boolean(onJoin);
  const canJoinWaitlist = view.canWaitlist && Boolean(onJoinWaitlist);
  const showJoinBar = canJoin || canJoinWaitlist;
  const teamPlayers =
    linkToPlayers || isOrganizerActive ? data.gameTeams : undefined;

  const actionsMenu = (ink: boolean) =>
    isOrganizerActive ? (
      <TournamentActionsMenu
        title={view.hero.name}
        description={view.hero.startLine}
        ink={ink}
        registrationClosed={Boolean(data.registrationClosedAt)}
        closePending={closePending}
        reopenPending={reopenPending}
        kickPending={kickPending}
        sharePending={sharePending}
        waitlist={data.waitlist}
        onShare={drawn && !finished ? onShare : undefined}
        onEdit={onEdit}
        onCloseRegistration={finished ? undefined : onCloseRegistration}
        onReopenRegistration={finished ? undefined : onReopenRegistration}
        onCancelGame={onCancelGame}
        onKickWaitlist={onKickWaitlist}
        onAddPlayer={onAddPlayer}
        onEditTeams={onEditTeams}
        undoDraw={
          roundsAsYouGo
            ? {
                locked: !data.canUndoDraw,
                pending: undoPending,
                onSelect: () => setUndoOpen(true),
              }
            : undefined
        }
      />
    ) : null;

  return (
    <TournamentPlayerActionsProvider
      enabled={isOrganizerActive}
      canOpenProfile={linkToPlayers}
      kickableUserIds={kickableTournamentOccupants(data).map(
        (occupant) => occupant.userId,
      )}
      kickPending={kickPending}
      onKick={onKick}
    >
      <div
        className={cn(
          "space-y-6",
          showJoinBar && "max-lg:pb-20",
          canJoin && canJoinWaitlist && "max-lg:pb-36",
        )}
      >
        {king && drawn ? (
          <TournamentKingHome
            data={data}
            backHref={backHref}
            actions={actionsMenu(data.finalOrderPostedAt == null)}
            album={album}
            onChangeCourts={() => setDrawOpen(true)}
            orderPending={kingActions.orderPending}
            orderError={kingActions.orderError}
            onPostFinalOrder={kingActions.onPostFinalOrder}
          />
        ) : roundsAsYouGo ? (
          <>
            <TournamentDrawnHome
              data={data}
              standings={tournamentStandingsView(data, locale)}
              finished={finished}
              backHref={backHref}
              actions={actionsMenu(!finished)}
              album={album}
              gameTeams={teamPlayers}
              onCancelMatch={
                isOrganizerActive ? onCancelKnockoutMatch : undefined
              }
              stamping={stamping}
              preview={roundsPreview}
            />
            <ConfirmDialog
              open={undoOpen}
              onOpenChange={setUndoOpen}
              title={m.tournament.poolDraw.undoConfirmTitle}
              description={m.tournament.poolDraw.undoConfirmCopy}
              confirmLabel={m.tournament.poolDraw.undoConfirmLabel}
              pending={undoPending}
              onConfirm={async () => {
                try {
                  await onUndo();
                } catch {
                  // The page shows the failure as a toast.
                }
              }}
            />
            {undoError ? (
              <p role="alert" className="text-destructive text-meta">
                {undoError.message}
              </p>
            ) : null}
          </>
        ) : drawn ? (
          <TournamentStandingsTree
            gameId={data.id}
            finished={finished}
            album={album}
            standings={tournamentStandingsView(data, locale)}
            poolTables={data.poolTables}
            knockout={data.knockout}
            gameTeams={teamPlayers}
            backHref={backHref}
            showUndo={showUndo}
            undoPending={undoPending}
            undoError={undoError}
            onUndo={onUndo}
            onCancelMatch={
              isOrganizerActive ? onCancelKnockoutMatch : undefined
            }
            stamping={stamping}
            actions={actionsMenu(false)}
          />
        ) : (
          <>
            <TournamentHero
              name={view.hero.name}
              eyebrow={view.hero.eyebrow}
              startLine={view.hero.startLine}
              sizeLine={view.hero.sizeLine}
              statusLine={view.hero.statusLine}
              stats={view.hero.stats}
              viewerUserId={data.viewerUserId}
              left={view.viewerSide?.left ?? null}
              right={view.viewerSide?.right ?? null}
              showYourTeam={view.seated}
              backHref={backHref}
              onShare={onShare}
              sharePending={sharePending}
              onInvite={onInvite}
              actions={actionsMenu(true)}
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
              king={king}
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
              onOpenSeat={onOpenSeat}
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
            {m.tournament.home.leaveTheSeat}
          </Button>
        ) : null}
        {finished || king ? null : (
          <p className="text-muted-foreground text-meta leading-relaxed">
            {m.tournament.home.closingLine}
          </p>
        )}

        <TournamentHomeActions
          joinKind={joinKind}
          isWaitlisted={data.isWaitlisted}
          onInvite={
            isOrganizerActive && drawn && !finished ? onInvite : undefined
          }
          leavePending={leavePending}
          eligibleTeams={data.eligibleTeams}
          teamId={teamId}
          onTeamIdChange={onTeamIdChange}
          onRegisterTeam={onRegisterTeam}
          registerTeamPending={registerTeamPending}
          onLeaveWaitlist={onLeaveWaitlist}
        />

        <GameLevelRangePanel game={data} />

        {/* Above the pre-draw and drawn screens, so it stays open across the post. */}
        {king && isOrganizerActive ? (
          <KingDrawSheet
            open={drawOpen}
            onOpenChange={setDrawOpen}
            gameTeams={data.gameTeams}
            viewerUserId={data.viewerUserId}
            courtsPosted={drawn}
            orderPosted={data.finalOrderPostedAt != null}
            pending={kingActions.courtsPending}
            error={kingActions.courtsError}
            onPost={kingActions.onPostCourts}
          />
        ) : null}

        {showJoinBar ? (
          <TournamentJoinBar
            pending={joinPending}
            onJoin={canJoin && onJoin ? () => onJoin() : undefined}
            onJoinWaitlist={canJoinWaitlist ? onJoinWaitlist : undefined}
          />
        ) : null}
      </div>
    </TournamentPlayerActionsProvider>
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
  king,
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
  onOpenSeat,
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
  /** King of the court swaps the Pool draw and the Rounds for the starting courts. */
  king: boolean;
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
  onOpenSeat?: OpenSeatHandler;
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
      {showDrawEntry && king ? (
        <KingDrawEntry
          completeTeams={completeTeams}
          teamCount={fieldSize}
          onOpen={onOpenDraw}
        />
      ) : null}
      {showDrawEntry && !king ? (
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
      {king ? null : (
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
      )}
      <TournamentTeamsSection
        sides={sides}
        viewerUserId={viewerUserId}
        canTakeSeat={canTakeSeat}
        onTakeSeat={onTakeSeat}
        onOpenSeat={onOpenSeat}
        linkToPlayers={linkToPlayers}
      />
      <TournamentSeatsGrid sides={sides} onInvite={onInvite} />
      {king ? (
        <KingHowItRuns courtCount={kingCourtCount(fieldSize)} />
      ) : (
        <TournamentYourRounds
          mode="schedule"
          venueName={venueName}
          rounds={schedule}
        />
      )}
    </div>
  );
}

function TournamentStandingsTree({
  gameId,
  finished,
  album,
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
  stamping,
  actions,
}: {
  gameId: string;
  finished: TournamentFinishedView | null;
  album: ReactNode;
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
  stamping: MatchStamping;
  actions?: ReactNode;
}) {
  const m = useMessages();
  return (
    <div className="space-y-6">
      <div>
        {finished ? (
          <TournamentFinishedHeader
            view={finished}
            gameId={gameId}
            backHref={backHref}
            chip={null}
            actions={actions}
          />
        ) : (
          <TournamentStandingsHeader
            actions={actions}
            name={standings.name}
            roundsPlayed={standings.roundsPlayed}
            finished={standings.finished}
            backHref={backHref}
            heading={standings.heading}
            lead={standings.lead}
            championLine={standings.championLine}
          />
        )}
        {standings.showKnockoutTree && knockout ? (
          <div className="pt-[18px]">
            <TournamentKnockoutTree
              rounds={knockout}
              onCancelMatch={onCancelMatch}
              stamping={stamping}
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
              {m.tournament.knockoutView.notThrough}
            </p>
          ) : null}
          <div className="pt-[18px]">
            <TournamentKnockoutTree
              rounds={knockout}
              headingLevel="h3"
              onCancelMatch={onCancelMatch}
              stamping={stamping}
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
      {album}
      {finished ? (
        <FinishedShareLink gameId={gameId} label={finished.share.label} />
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
  const m = useMessages();
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
          {m.game.cta.join}
        </Button>
      ) : null}
      {onJoinWaitlist ? (
        <Button
          type="button"
          className="min-h-11 w-full"
          disabled={pending}
          onClick={onJoinWaitlist}
        >
          {m.game.cta.joinWaitlist}
        </Button>
      ) : null}
    </div>
  );
}

function TournamentHomeActions({
  joinKind,
  isWaitlisted,
  leavePending,
  eligibleTeams,
  teamId,
  onTeamIdChange,
  onRegisterTeam,
  registerTeamPending,
  onLeaveWaitlist,
  onInvite,
}: {
  joinKind: TournamentHomeJoinKind | null;
  isWaitlisted: boolean;
  leavePending: boolean;
  eligibleTeams: GameDetail["eligibleTeams"];
  teamId: string;
  onTeamIdChange: (teamId: string) => void;
  onRegisterTeam: (teamId: string) => void;
  registerTeamPending: boolean;
  onLeaveWaitlist?: () => void;
  onInvite?: () => void;
}) {
  const m = useMessages();

  return (
    <div className="flex flex-col gap-2">
      {joinKind === "register_team" ? (
        eligibleTeams.length === 0 ? (
          <p className="text-muted-foreground text-meta leading-relaxed">
            {m.webTournament.home.needCompleteTeam}
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
                <FieldLabel htmlFor="tournament-team-id">
                  {m.webTournament.home.teamLabel}
                </FieldLabel>
                <Select value={teamId} onValueChange={onTeamIdChange}>
                  <SelectTrigger id="tournament-team-id">
                    <SelectValue
                      placeholder={m.webTournament.home.selectTeam}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {m.webTournament.home.teamOption(
                          team.name,
                          team.memberNames.join(" / "),
                        )}
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
              {registerTeamPending
                ? m.webTournament.home.registering
                : m.game.action.registerTeam}
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
          {m.game.action.leaveWaitlist}
        </Button>
      ) : null}
      {onInvite ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          onClick={onInvite}
        >
          {m.tournament.home.inviteAction}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Everything behind the ⋮ at the top of a Tournament: the Organizer's tools,
 * then waitlist kicks, then cancelling the Game. Seated players are kicked
 * from their seat or Game team, not from here.
 */
function TournamentActionsMenu({
  title,
  description,
  ink,
  registrationClosed,
  closePending,
  reopenPending,
  kickPending,
  sharePending,
  waitlist,
  onShare,
  onEdit,
  onCloseRegistration,
  onReopenRegistration,
  onCancelGame,
  onKickWaitlist,
  onAddPlayer,
  onEditTeams,
  undoDraw,
}: {
  title: string;
  description: string | null;
  ink: boolean;
  registrationClosed: boolean;
  closePending: boolean;
  reopenPending: boolean;
  kickPending: boolean;
  sharePending: boolean;
  waitlist: GameDetail["waitlist"];
  onShare?: () => void;
  onEdit?: () => void;
  onCloseRegistration?: () => void;
  onReopenRegistration?: () => void;
  onCancelGame?: () => void;
  onKickWaitlist?: (waitlistId: string) => void;
  onAddPlayer?: () => void;
  onEditTeams?: () => void;
  undoDraw?: { locked: boolean; pending: boolean; onSelect: () => void };
}) {
  const m = useMessages();

  const tools: GameActionsSheetRow[] = [];
  if (onAddPlayer) {
    tools.push({
      key: "add_player",
      label: m.group.addPlayer.action,
      icon: UserPlusIcon,
      onSelect: onAddPlayer,
    });
  }
  if (onEditTeams) {
    tools.push({
      key: "edit_teams",
      label: m.editTeams.action,
      hint: m.editTeams.tournamentMenuHint,
      icon: ArrowLeftRight,
      onSelect: onEditTeams,
    });
  }
  if (onShare) {
    tools.push({
      key: "share",
      label: m.common.share,
      icon: Share2Icon,
      disabled: sharePending,
      onSelect: onShare,
    });
  }
  if (registrationClosed && onReopenRegistration) {
    tools.push({
      key: "reopen_registration",
      label: m.game.action.reopenRegistration,
      icon: LockOpenIcon,
      disabled: reopenPending,
      onSelect: onReopenRegistration,
    });
  } else if (!registrationClosed && onCloseRegistration) {
    tools.push({
      key: "close_registration",
      label: m.game.action.closeRegistration,
      icon: LockIcon,
      disabled: closePending,
      onSelect: onCloseRegistration,
    });
  }
  if (onEdit) {
    tools.push({
      key: "edit",
      label: m.game.action.editGame,
      icon: PencilIcon,
      onSelect: onEdit,
    });
  }

  const kicks: GameActionsSheetRow[] = onKickWaitlist
    ? waitlist.map((entry) => ({
        key: `kick-waitlist-${entry.id}`,
        label: m.webTournament.kickFromWaitlist(entry.name),
        icon: UserMinusIcon,
        tone: "danger" as const,
        disabled: kickPending,
        onSelect: () => onKickWaitlist(entry.id),
      }))
    : [];

  const undo: GameActionsSheetRow[] = undoDraw
    ? [
        {
          key: "undo_draw",
          label: undoDraw.locked
            ? m.tournamentRounds.undo.locked
            : m.tournamentRounds.undo.action,
          icon: RotateCcwIcon,
          tone: "danger",
          disabled: undoDraw.locked || undoDraw.pending,
          onSelect: undoDraw.onSelect,
        },
      ]
    : [];

  const cancel: GameActionsSheetRow[] = onCancelGame
    ? [
        {
          key: "cancel_game",
          label: m.game.action.cancelGame,
          icon: Ban,
          tone: "danger",
          onSelect: onCancelGame,
        },
      ]
    : [];

  return (
    <GameActionsSheet
      title={title}
      description={description}
      triggerClassName={
        ink ? ACTION_MENU_INK_BOXED_TRIGGER : ACTION_MENU_PAPER_BOXED_TRIGGER
      }
      groups={[tools, kicks, undo, cancel]}
    />
  );
}
