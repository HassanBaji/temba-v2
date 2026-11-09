"use client";

import {
  Ban,
  LockIcon,
  LockOpenIcon,
  PencilIcon,
  ShirtIcon,
  UserPlusIcon,
  UserRoundPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import {
  ACTION_MENU_INK_BOXED_TRIGGER,
  ACTION_MENU_PAPER_BOXED_TRIGGER,
} from "~/components/common/action-menu";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { RenameUnclaimedPlayerDialog } from "~/components/common/rename-unclaimed-player-dialog";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { AddPlayerDialog } from "~/components/games/add-player-dialog";
import { challengeInfoRows } from "~/components/games/challenge-details-block";
import { ChallengeShareButton } from "~/components/games/challenge-share-button";
import { ChallengeSquads } from "~/components/games/challenge-squad-grid";
import { ChallengeTeamVsTeam } from "~/components/games/challenge-team-vs-team";
import { NameSquadDialog } from "~/components/games/name-squad-dialog";
import { FootballGameHeroCard } from "~/components/games/football-game-hero";
import {
  FootballInfoRows,
  type FootballInfoRow,
} from "~/components/games/football-info-rows";
import { FootballJoinDialog } from "~/components/games/football-join-dialog";
import { FriendlyGameCtaBar } from "~/components/games/friendly-game-cta-bar";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import { FootballPlayerDialog } from "~/components/games/football-player-dialog";
import { PoolSections, SeatBar } from "~/components/games/football-pool-grid";
import { FootballScoreCard } from "~/components/games/football-score-card";
import { TeamColumns } from "~/components/games/football-team-columns";
import { PlayedFootballBoard } from "~/components/games/played/played-football-board";
import { PlayedGameView } from "~/components/games/played/played-game-view";
import { GameActionsSheet } from "~/components/games/game-actions-sheet";
import { GameEditDialog } from "~/components/games/game-edit-dialog";
import {
  gameInviteSubtitle,
  InviteDoorDialog,
} from "~/components/invites/invite-door-dialog";
import { useLocale, useMessages } from "~/components/locale-provider";
import { MarksSection } from "~/components/marks/marks-section";
import { MvpRow } from "~/components/marks/mvp-row";
import { useGameMarks } from "~/components/marks/use-game-marks";
import { Button } from "~/components/ui/button";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { useGameEdit } from "~/components/games/use-game-edit";
import { gameEditSectionsFor } from "@repo/domain/game-edit-form";
import { gamePlayersLink } from "~/lib/game-player-links";
import { shareLinkWithFeedback } from "~/lib/share-link";
import { cn } from "~/lib/utils";
import {
  bibNames,
  footballHeroLines,
  poolLayout,
  slotCode,
  viewerSideLine,
  type BoardPlayer,
} from "@repo/domain/football-board";
import {
  footballGameDetailsModel,
  type FootballGameDetailsInput,
} from "@repo/domain/football-game-details";
import {
  footballTeamsMethodLabel,
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import {
  cancelGameAction,
  cancelGameConsequence,
  closeRegistrationAction,
  editGameAction,
  gameJoinToast,
  gameToast,
  kickAction,
  kickedToast,
  leaveGameAction,
  leaveGameConsequence,
  leaveWaitlistAction,
  leaveWaitlistConsequence,
  reopenRegistrationAction,
} from "@repo/domain/game-copy";
import { organizerCanAddPlayer } from "@repo/domain/add-player-by-phone";
import { squadButtonCopy } from "@repo/domain/matchday-squad";
import { challengeHeroSubLine } from "@repo/domain/challenge-game-details";
import {
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRequest,
  type GameKickTarget,
} from "@repo/domain/game-kick-confirm";
import { gameInviteClipboardText } from "@repo/domain/game-invite-share-message";
import { gameInviteAccess } from "@repo/domain/invites";
import { gameIsPlayed, playedFootballModel } from "@repo/domain/played-game";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { gameCustomName, gameDisplayName } from "@repo/domain/game-custom-name";
import { api, type RouterOutputs } from "~/trpc/react";

type FootballGame = RouterOutputs["games"]["byId"];

export function FootballGameDetails({
  gameId,
  game,
  openInvites,
  openJoin,
}: {
  gameId: string;
  game: FootballGame;
  openInvites: boolean;
  openJoin: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const t = m.webTournament.footballDetails;
  const toastCopy = gameToast(locale);
  const utils = api.useUtils();
  const router = useRouter();
  const [now] = React.useState(() => new Date());
  const [editOpen, setEditOpen] = React.useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = React.useState(false);
  const [invitesOpen, setInvitesOpen] = React.useState(openInvites);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [leaveOpen, setLeaveOpen] = React.useState(false);
  const [leaveWaitlistOpen, setLeaveWaitlistOpen] = React.useState(false);
  const [kickConfirm, setKickConfirm] = React.useState<GameKickTarget | null>(
    null,
  );
  const [joinMode, setJoinMode] = React.useState<"join" | "edit" | null>(null);
  const [selected, setSelected] = React.useState<BoardPlayer | null>(null);
  const [renaming, setRenaming] = React.useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [squadTeamId, setSquadTeamId] = React.useState<string | null>(null);
  const autoJoined = React.useRef(false);
  const challenge = game.challenge;

  const board = api.games.footballBoard.useQuery({ gameId });
  const players = board.data?.players ?? [];
  const teams = board.data?.teams ?? null;
  const names = teams ? bibNames(teams.bibs, locale) : null;
  const viewer = players.find((player) => player.isViewer) ?? null;
  const marks = useGameMarks(gameId, board.data?.match?.status === "completed");

  const input: FootballGameDetailsInput = {
    ...game,
    roster: game.roster ?? { users: [], count: 0, cap: game.playersAllowed },
  };
  const model = footballGameDetailsModel(input, now, locale);
  const played = gameIsPlayed(
    { windowEnd: game.windowEnd, matches: game.matches },
    now,
  );
  const price = formatPricePerPlayerFils(game.pricePerPlayerFils, locale);
  const layout = poolLayout(players, game.sideSize, game.playersAllowed);
  const baseLines = footballHeroLines(
    {
      windowStart: game.windowStart,
      windowEnd: game.windowEnd,
      cancelledAt: game.cancelledAt,
      sideSize: game.sideSize,
      venueName: game.venue?.name ?? null,
      pitchName: game.recordedCourts[0]?.name ?? null,
      teamsSet: teams != null && !challenge,
      scored: board.data?.match?.score != null,
    },
    now,
    locale,
  );
  const lines = challenge
    ? {
        ...baseLines,
        subLine: challengeHeroSubLine(
          {
            pitchName: game.recordedCourts[0]?.name ?? null,
            sideSize: game.sideSize,
            windowStart: game.windowStart,
            windowEnd: game.windowEnd,
          },
          locale,
        ),
      }
    : baseLines;

  const savedCustomName = gameCustomName(game);

  async function refreshGame() {
    await utils.games.byId.invalidate({ id: gameId });
    await utils.games.footballBoard.invalidate({ gameId });
    await utils.users.home.invalidate();
    await utils.games.listPublicPickup.invalidate();
    await utils.games.listMyGames.invalidate();
  }

  const onError = toastGlobalFormError;
  const register = api.games.register.useMutation({
    onSuccess: async (result) => {
      setJoinMode(null);
      toast.success(gameJoinToast(result.waitlisted, locale));
      await refreshGame();
    },
  });
  const setRole = api.games.setFootballRole.useMutation({
    onSuccess: async () => {
      setJoinMode(null);
      toast.success(m.common.saved);
      await refreshGame();
    },
  });
  const confirmScore = api.games.confirmMatchResult.useMutation({
    onSuccess: async () => {
      toast.success(t.scoreConfirmedToast);
      await refreshGame();
    },
    onError,
  });
  const leave = api.games.leave.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.left);
      await refreshGame();
    },
    onError,
  });
  const leaveWaitlist = api.games.leaveWaitlist.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.leftWaitlist);
      await refreshGame();
    },
    onError,
  });
  const kick = api.games.kick.useMutation({
    onSuccess: refreshGame,
    onError,
  });
  const cancel = api.games.cancel.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.gameCancelled);
      await refreshGame();
    },
    onError,
  });
  const closeRegistration = api.games.closeRegistration.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.registrationClosed);
      await refreshGame();
    },
    onError,
  });
  const reopenRegistration = api.games.reopenRegistration.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.registrationReopened);
      await refreshGame();
    },
    onError,
  });
  const editSections = gameEditSectionsFor({
    format: game.format,
    sport: game.sport,
    groupId: game.groupId,
    tournamentRounds: false,
  });
  const edit = useGameEdit({
    gameId,
    game,
    sections: editSections,
    seasons: game.groupSeasons,
    open: editOpen,
    mvpEnabled:
      game.isOrganizer &&
      game.format === "friendly_game" &&
      game.cancelledAt == null,
    onSaved: refreshGame,
    onClose: () => setEditOpen(false),
  });

  const inviteAccess = game.canInvite
    ? gameInviteAccess({
        friendlyChrome: false,
        isOrganizer: game.isOrganizer,
        registrationStatus: game.registrationStatus,
        cancelledAt: game.cancelledAt,
        registrationMode: game.registrationMode,
        partnerRequired: false,
      })
    : { canManage: false, canSendLookup: false };
  function shareGamePage() {
    const text = utils.games.resultLink
      .fetch({ gameId })
      .then((result) => ({ text: inviteShareText(result.url) }))
      .catch(() => null);
    void shareLinkWithFeedback(
      text,
      m.webDashboard.game.toast.linkCopied,
      locale,
    );
  }
  function inviteShareText(url: string) {
    return gameInviteClipboardText({
      format: game.format,
      registrationMode: game.registrationMode,
      shortUrl: url,
      sport: game.sport,
      roster: {
        customName: savedCustomName,
        venueName: game.venue?.name ?? t.venueFallback,
        courtName: game.recordedCourts[0]?.name ?? null,
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
        sides: [],
        shortUrl: url,
        football: {
          sideSize: game.sideSize,
          playersAllowed: game.playersAllowed,
          players,
        },
        levelMinTenths: game.levelMinTenths,
        levelMaxTenths: game.levelMaxTenths,
        waitlist: game.waitlist,
        locale,
      },
    });
  }

  React.useEffect(() => {
    if (openJoin && !autoJoined.current && model.cta?.kind === "join") {
      autoJoined.current = true;
      setJoinMode("join");
    }
  }, [openJoin, model.cta?.kind]);

  function requestKick(request: GameKickRequest) {
    setKickConfirm(
      gameKickTarget(
        {
          registeredPlayers: game.registeredPlayers,
          sides: [],
          waitlist: game.waitlist,
        },
        request,
        locale,
      ),
    );
  }

  const kickCopy = kickConfirm
    ? gameKickConfirmCopy(
        kickConfirm,
        {
          partnerRequired: false,
          drawPosted: false,
        },
        locale,
      )
    : null;
  const gameName = gameDisplayName(game, locale);
  const organizer = model.organizer;
  const cta = model.cta;

  function submitJoin(role: FootballRole, position: FootballPosition) {
    if (joinMode === "edit") {
      setRole.mutate({ gameId, role, position });
    } else {
      register.mutate({ gameId, football: { role, position } });
    }
  }

  const canOpenProfiles = gamePlayersLink(game);
  function onPressPlayer(userId: string) {
    const player = players.find((row) => row.userId === userId);
    if (player && organizer && !player.isViewer) {
      setSelected(player);
    } else if (canOpenProfiles) {
      router.push(playerProfilePath(userId, "football"));
    }
  }
  const pressPlayer = organizer || canOpenProfiles ? onPressPlayer : undefined;
  const teamsHref = `/dashboard/games/${gameId}/teams`;
  const scoreHref = `/dashboard/games/${gameId}/score`;
  const canMakeTeams =
    game.canMakeTeams && (board.data?.viewer.canMakeTeams ?? false);
  const viewerCode = viewer ? slotCode(viewer, locale) : null;
  const heroMuted =
    model.hero.tone === "ink" ? "text-dim" : "text-muted-foreground";
  const joinSubtitle = [
    lines.dayLine,
    game.sideSize ? m.createGame.sideSize(game.sideSize) : null,
    m.football.board.seatsOpen(layout.openSeats),
  ]
    .filter(Boolean)
    .join(", ");
  const gameInfoRows: FootballInfoRow[] = [
    ...(game.groupName
      ? [{ label: m.game.played.group, value: game.groupName }]
      : []),
    ...(game.season ? [{ label: t.seasonRow, value: game.season.name }] : []),
    ...(price
      ? [
          {
            label: t.pitchCost,
            value:
              price === m.createGame.price.free
                ? price
                : m.game.partner.priceEach(price),
          },
        ]
      : []),
    {
      label: m.common.teams,
      value: teams
        ? footballTeamsMethodLabel(teams.method, locale)
        : t.organizerMakesTeams,
    },
    ...(names
      ? [
          {
            label: m.game.played.bibs,
            value: m.game.played.bibsLine(names.slot1, names.slot2),
          },
        ]
      : []),
    {
      label: m.game.played.countsForRatingLabel,
      value: game.rated ? m.common.yes : m.common.no,
    },
  ];
  const infoRows: FootballInfoRow[] = challenge
    ? challengeInfoRows(challenge, game.sport, locale)
    : gameInfoRows;
  const squadSide = challenge?.sides.find(
    (side) => side.teamId === squadTeamId,
  );
  const namableSide = challenge?.viewerCanNameSide
    ? challenge.sides.find(
        (side) => side.teamId === challenge.viewerCanNameSide,
      )
    : undefined;
  const onInk = model.hero.tone === "ink";
  const joinFamily =
    !game.isChallengeGame &&
    (cta?.kind === "join" || cta?.kind === "join_waitlist")
      ? { kind: cta.kind }
      : null;

  const showHeroActions =
    !challenge &&
    (cta?.kind === "registered" ||
      cta?.kind === "waitlisted" ||
      (inviteAccess.canManage && !teams));
  const heroActions = showHeroActions ? (
    <div className="mt-4 space-y-2">
      {cta?.kind === "registered" ? (
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 font-semibold">
            {viewerCode ? t.youreInAs(viewerCode) : m.game.cta.youreIn}
          </p>
          {board.data?.match?.score == null && !played ? (
            <Button
              type="button"
              size="sm"
              variant={onInk ? "outline-inverse" : "outline"}
              onClick={() => {
                setRole.reset();
                setJoinMode("edit");
              }}
            >
              {t.change}
            </Button>
          ) : null}
          {played ? null : (
            <Button
              type="button"
              size="sm"
              variant={onInk ? "outline-inverse" : "outline"}
              onClick={() => setLeaveOpen(true)}
            >
              {leaveGameAction(locale)}
            </Button>
          )}
        </div>
      ) : null}
      {cta?.kind === "waitlisted" ? (
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 font-semibold">{cta.title}</p>
          <Button
            type="button"
            size="sm"
            variant={onInk ? "outline-inverse" : "outline"}
            onClick={() => setLeaveWaitlistOpen(true)}
          >
            {leaveWaitlistAction(locale)}
          </Button>
        </div>
      ) : null}
      {inviteAccess.canManage && !teams ? (
        <Button
          type="button"
          size="lg"
          variant={onInk ? "outline-inverse" : "outline"}
          className="w-full"
          onClick={() => setInvitesOpen(true)}
        >
          {t.invitePlayers}
        </Button>
      ) : null}
    </div>
  ) : null;

  const gameHeroBody =
    teams && names ? (
      <>
        <TeamColumns
          players={players}
          bibs={teams.bibs}
          names={names}
          muted={heroMuted}
          onOpenPlayer={pressPlayer}
        />
        <p className={`${heroMuted} text-meta mt-3`}>
          {[
            viewerSideLine(
              board.data?.viewer ?? { sideIndex: null },
              players,
              names,
              locale,
            ),
            t.captainsPickBeforeKickoff,
          ]
            .filter(Boolean)
            .join(" ")}
        </p>
        {heroActions}
      </>
    ) : (
      <>
        <div
          className={`border-t pt-4 ${onInk ? "border-dimrule" : "border-rule"}`}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={`${heroMuted} text-meta`}>{t.playersIn}</p>
              <p className="flex items-baseline gap-1.5">
                <span className="font-expanded text-display tabular-nums leading-none">
                  {players.length}
                </span>
                <span className={heroMuted}>{t.ofSeats(layout.seats)}</span>
              </p>
            </div>
            <p className={`${heroMuted} text-meta text-end`}>
              {t.teamsByOrganizer}
            </p>
          </div>
          <div className="mt-3">
            <SeatBar
              seats={layout.seats}
              filled={players.length}
              tone={model.hero.tone}
            />
          </div>
        </div>
        {heroActions}
      </>
    );

  const heroBody = challenge ? (
    <div
      className={`border-t pt-[18px] ${onInk ? "border-dimrule" : "border-rule"}`}
    >
      <ChallengeTeamVsTeam
        sides={challenge.sides}
        sport={game.sport}
        tone={model.hero.tone}
      />
      <ChallengeSquads
        sides={challenge.sides}
        tone={model.hero.tone}
        action={
          namableSide?.teamId
            ? {
                ...squadButtonCopy(
                  namableSide.named.length,
                  namableSide.name ?? m.team.memberFallback,
                  locale,
                ),
                onClick: () => setSquadTeamId(namableSide.teamId),
              }
            : undefined
        }
      />
    </div>
  ) : (
    gameHeroBody
  );

  const score = board.data?.match?.score ?? null;
  const playedModel =
    teams && names && score && board.data?.match?.status === "completed"
      ? playedFootballModel(
          {
            players,
            bibs: teams.bibs,
            score,
            confirmed: board.data.match.confirmed,
            enteredByName: board.data.match.enteredByName,
            teamsMethod: teams.method,
            sideSize: game.sideSize,
            windowStart: game.windowStart,
            windowEnd: game.windowEnd,
            venue: game.venue,
            courtName: game.recordedCourts[0]?.name ?? null,
            groupName: game.groupName,
            rated: game.rated,
            ratingImpact: game.ratingImpact,
          },
          locale,
        )
      : null;
  const canAddPlayer = game.canAddPlayer && organizerCanAddPlayer(game);
  const menu = organizer ? (
    <GameActionsSheet
      title={savedCustomName ?? m.football.details.fallbackTitle}
      description={lines.dayLine}
      triggerClassName={
        playedModel || model.hero.tone === "ink"
          ? ACTION_MENU_INK_BOXED_TRIGGER
          : ACTION_MENU_PAPER_BOXED_TRIGGER
      }
      groups={[
        [
          {
            key: "edit",
            label: editGameAction(locale),
            icon: PencilIcon,
            onSelect: () => setEditOpen(true),
          },
          ...(canMakeTeams
            ? [
                {
                  key: "teams",
                  label: teams
                    ? m.webTournament.footballTeams.editTeams
                    : m.webTournament.footballTeams.makeTeams,
                  icon: ShirtIcon,
                  href: teamsHref,
                },
              ]
            : []),
          ...(challenge
            ? []
            : [
                organizer.registration === "reopen"
                  ? {
                      key: "reopen_registration",
                      label: reopenRegistrationAction(locale),
                      icon: LockOpenIcon,
                      disabled: reopenRegistration.isPending,
                      onSelect: () => reopenRegistration.mutate({ gameId }),
                    }
                  : {
                      key: "close_registration",
                      label: closeRegistrationAction(locale),
                      icon: LockIcon,
                      disabled: closeRegistration.isPending,
                      onSelect: () => closeRegistration.mutate({ gameId }),
                    },
              ]),
          ...(inviteAccess.canManage
            ? [
                {
                  key: "invite",
                  label: m.tournament.home.inviteAction,
                  icon: UserRoundPlusIcon,
                  onSelect: () => setInvitesOpen(true),
                },
              ]
            : []),
          ...(canAddPlayer
            ? [
                {
                  key: "add_player",
                  label: m.group.addPlayer.action,
                  icon: UserPlusIcon,
                  onSelect: () => setAddPlayerOpen(true),
                },
              ]
            : []),
        ],
        [
          {
            key: "cancel",
            label: organizer.cancelLabel,
            icon: Ban,
            tone: "danger",
            onSelect: () => setCancelOpen(true),
          },
        ],
      ]}
    />
  ) : null;

  return (
    <DashboardShell
      title={m.football.details.fallbackTitle}
      hidePageHeader
      hideMobileTopBar
      isSubPage={true}
      hideNav={true}
    >
      <div
        className={cn(
          "space-y-6",
          game.cancelledAt != null && "max-md:pt-4",
          joinFamily && !playedModel && "max-lg:pb-20",
        )}
      >
        {game.cancelledAt ? (
          <section
            role="status"
            className="bg-destructive/10 text-destructive rounded-xl p-4"
          >
            <div className="flex gap-3">
              <Ban
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0"
                strokeWidth={2}
              />
              <p className="text-title font-semibold tracking-[-0.01em]">
                {t.cancelledHeading}
              </p>
            </div>
          </section>
        ) : null}

        {playedModel ? (
          <PlayedGameView
            gameId={gameId}
            menu={menu ?? undefined}
            hero={{
              dateLine: playedModel.dateLine,
              tag: playedModel.tag,
              result: playedModel.result,
              venueLine: playedModel.venueLine,
              whenLine: playedModel.whenLine,
              you: playedModel.you,
              avatar: viewer
                ? { name: viewer.name, image: viewer.image }
                : null,
            }}
            board={
              <PlayedFootballBoard
                sides={playedModel.board}
                hasWinner={playedModel.result.hasWinner}
                scorers={playedModel.scorers}
              />
            }
            heroFooter={
              <MvpRow marks={marks} canOpenProfile={canOpenProfiles} />
            }
            marks={<MarksSection marks={marks} />}
            columns={playedModel.columns}
            unplaced={playedModel.unplaced}
            facts={playedModel.facts}
            onPressPlayer={
              pressPlayer ? (row) => pressPlayer(row.userId) : undefined
            }
          />
        ) : (
          <FootballGameHeroCard
            tone={model.hero.tone}
            lines={lines}
            tag={challenge ? m.challenge.gameDetails.tag : undefined}
            actions={
              challenge && !game.cancelledAt ? (
                <>
                  <ChallengeShareButton
                    onShare={shareGamePage}
                    tone={model.hero.tone}
                  />
                  {menu}
                </>
              ) : (
                menu
              )
            }
          >
            {heroBody}
          </FootballGameHeroCard>
        )}

        {joinFamily && !playedModel ? (
          <div className="max-lg:contents">
            <FriendlyGameCtaBar
              family={joinFamily}
              lines={
                joinFamily.kind === "join"
                  ? {
                      title: m.football.board.seatsOpen(layout.openSeats),
                      subline:
                        price && price !== m.createGame.price.free
                          ? m.game.partner.priceEach(price)
                          : null,
                    }
                  : null
              }
              joinPending={register.isPending && joinMode == null}
              waitlistPending={false}
              onJoin={() => {
                register.reset();
                setJoinMode("join");
              }}
              onJoinWaitlist={() => register.mutate({ gameId })}
              onLeaveWaitlist={() => setLeaveWaitlistOpen(true)}
              onAddResult={() => undefined}
            />
          </div>
        ) : null}

        {game.cancelledAt ? null : <GameLevelRangePanel game={game} />}

        {board.error ? (
          <p role="alert" className="text-destructive text-meta">
            {t.lineupLoadFailed} {board.error.message}
          </p>
        ) : null}

        {!teams ? (
          <section
            aria-labelledby="football-players-heading"
            className="space-y-3"
          >
            <PoolSections
              players={layout.pool}
              seats={layout.seats}
              headingId="football-players-heading"
              onOpenPlayer={pressPlayer}
            />
            <p className="text-muted-foreground text-meta">{t.positionsNote}</p>
          </section>
        ) : null}

        {teams && names && !playedModel ? (
          <FootballScoreCard
            bibs={teams.bibs}
            names={names}
            players={players}
            match={board.data?.match ?? null}
            canEnterScore={board.data?.viewer.canEnterScore ?? false}
            canConfirm={board.data?.viewer.canConfirm ?? false}
            canConfirmAsOrganizer={
              board.data?.viewer.canConfirmAsOrganizer ?? false
            }
            confirmPending={confirmScore.isPending}
            scoreHref={scoreHref}
            onConfirm={() => {
              const matchId = board.data?.match?.id;
              if (matchId) {
                confirmScore.mutate({ gameId, matchId });
              }
            }}
          />
        ) : null}

        {playedModel ? null : <FootballInfoRows rows={infoRows} />}

        {canMakeTeams ? (
          <section className="border-rule bg-paper flex items-center justify-between gap-3 rounded-xl border p-5">
            <div>
              <h2 className="font-medium">{m.common.teams}</h2>
              <p className="text-muted-foreground text-meta">
                {teams
                  ? footballTeamsMethodLabel(teams.method, locale)
                  : t.teamsNotSetYet}
              </p>
            </div>
            <Button asChild>
              <Link href={teamsHref}>
                {teams
                  ? m.webTournament.footballTeams.editTeams
                  : m.webTournament.footballTeams.makeTeams}
              </Link>
            </Button>
          </section>
        ) : null}

        {organizer && model.waitlistRows.length > 0 ? (
          <section
            aria-labelledby="football-waitlist-heading"
            className="space-y-3"
          >
            <h2
              id="football-waitlist-heading"
              className="text-title font-semibold tracking-[-0.01em]"
            >
              {t.waitlistHeading}
            </h2>
            <RowList>
              {game.waitlist.map((entry) => (
                <ListRow
                  key={entry.id}
                  leading={
                    <UserAvatar
                      name={entry.name}
                      image={entry.image}
                      size="lg"
                    />
                  }
                  title={entry.name}
                  trailing={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={kick.isPending}
                      aria-label={m.webTournament.kickName(entry.name)}
                      onClick={() => requestKick({ waitlistId: entry.id })}
                    >
                      {kickAction(locale)}
                    </Button>
                  }
                />
              ))}
            </RowList>
          </section>
        ) : null}
      </div>

      <FootballJoinDialog
        open={joinMode != null}
        onOpenChange={(next) => {
          if (!next) {
            setJoinMode(null);
          }
        }}
        mode={joinMode ?? "join"}
        subtitle={joinSubtitle}
        players={players}
        viewer={{
          role: viewer?.role ?? null,
          position: viewer?.position ?? null,
        }}
        price={price}
        teamsLine={teams ? t.teamsSet : t.teamsMadeByOrganizer}
        pending={register.isPending || setRole.isPending}
        error={
          (joinMode === "edit" ? setRole.error : register.error)?.message ??
          null
        }
        onSubmit={submitJoin}
      />
      {canAddPlayer || addPlayerOpen ? (
        <AddPlayerDialog
          open={addPlayerOpen}
          onOpenChange={setAddPlayerOpen}
          gameId={gameId}
          placement="football"
          sides={[]}
          groupName={game.groupName}
          onAdded={refreshGame}
        />
      ) : null}
      <FootballPlayerDialog
        player={selected}
        canOpenProfile={canOpenProfiles}
        onOpenChange={(next) => {
          if (!next) {
            setSelected(null);
          }
        }}
        onRemove={(userId) => {
          setSelected(null);
          requestKick({ userId });
        }}
        onRename={(player) => {
          setSelected(null);
          setRenaming(player);
        }}
      />
      {organizer ? (
        <RenameUnclaimedPlayerDialog
          player={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {organizer ? (
        <GameEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          edit={edit}
          sections={editSections}
          context={{
            venueName: game.venue?.name ?? null,
            courtName: game.recordedCourts[0]?.name ?? null,
            groupName: game.groupName,
            joined: game.registeredUserCount,
            seasons: game.groupSeasons,
            canChangeSeason: game.canChangeSeason,
            rounds: null,
          }}
        />
      ) : null}

      {inviteAccess.canManage ? (
        <InviteDoorDialog
          door={{
            kind: "game",
            gameId,
            canLookup: inviteAccess.canSendLookup,
            canLink: true,
            subtitle: gameInviteSubtitle(
              {
                windowStart: game.windowStart,
                courtName: game.recordedCourts[0]?.name ?? null,
                venueName: game.venue?.name ?? null,
                sides: [],
              },
              locale,
            ),
            shareMessage: inviteShareText,
          }}
          open={invitesOpen}
          onOpenChange={setInvitesOpen}
        />
      ) : null}

      {squadSide?.teamId ? (
        <NameSquadDialog
          open
          onOpenChange={(next) => {
            if (!next) {
              setSquadTeamId(null);
            }
          }}
          gameId={gameId}
          teamId={squadSide.teamId}
          sideSize={squadSide.sideSize}
          kickoff={game.windowStart}
          namedUserIds={squadSide.named.map((player) => player.userId)}
          onSaved={() =>
            Promise.all([refreshGame(), utils.challenges.invalidate()])
          }
        />
      ) : null}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t.cancelTitle(gameName)}
        description={cancelGameConsequence(model.rosterRows.length, locale)}
        confirmLabel={cancelGameAction(locale)}
        pending={cancel.isPending}
        onConfirm={async () => {
          await cancel.mutateAsync({ gameId });
        }}
      />
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={t.leaveTitle(gameName)}
        description={leaveGameConsequence(locale)}
        confirmLabel={leaveGameAction(locale)}
        pending={leave.isPending}
        onConfirm={async () => {
          await leave.mutateAsync({ gameId });
        }}
      />
      <ConfirmDialog
        open={leaveWaitlistOpen}
        onOpenChange={setLeaveWaitlistOpen}
        title={t.leaveWaitlistTitle}
        description={leaveWaitlistConsequence(locale)}
        confirmLabel={leaveWaitlistAction(locale)}
        pending={leaveWaitlist.isPending}
        onConfirm={async () => {
          await leaveWaitlist.mutateAsync({ gameId });
        }}
      />
      <ConfirmDialog
        open={kickConfirm != null}
        onOpenChange={(open) => {
          if (!open) {
            setKickConfirm(null);
          }
        }}
        title={kickCopy?.title ?? t.kickPlayerTitle}
        description={kickCopy?.description}
        confirmLabel={kickAction(locale)}
        pending={kick.isPending}
        onConfirm={async () => {
          if (!kickConfirm) {
            return;
          }
          await kick.mutateAsync(
            kickConfirm.kind === "player"
              ? { gameId, userId: kickConfirm.userId }
              : { gameId, waitlistId: kickConfirm.waitlistId },
          );
          toast.success(kickedToast(kickConfirm.name, locale));
        }}
      />
    </DashboardShell>
  );
}
