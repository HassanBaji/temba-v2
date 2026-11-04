"use client";

import { Ban } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import {
  ACTION_MENU_INK_BOXED_TRIGGER,
  ACTION_MENU_PAPER_BOXED_TRIGGER,
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { RenameUnclaimedPlayerDialog } from "~/components/common/rename-unclaimed-player-dialog";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { AddPlayerDialog } from "~/components/games/add-player-dialog";
import { FootballGameHeroCard } from "~/components/games/football-game-hero";
import {
  FootballInfoRows,
  type FootballInfoRow,
} from "~/components/games/football-info-rows";
import { FootballJoinDialog } from "~/components/games/football-join-dialog";
import { FootballPlayerDialog } from "~/components/games/football-player-dialog";
import { PoolSections, SeatBar } from "~/components/games/football-pool-grid";
import { FootballScoreCard } from "~/components/games/football-score-card";
import { TeamColumns } from "~/components/games/football-team-columns";
import { PlayedFootballBoard } from "~/components/games/played/played-football-board";
import { PlayedGameView } from "~/components/games/played/played-game-view";
import { GameEditDialog } from "~/components/games/game-edit-dialog";
import {
  gameInviteSubtitle,
  InviteDoorDialog,
} from "~/components/invites/invite-door-dialog";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Button } from "~/components/ui/button";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { useGameEdit } from "~/components/games/use-game-edit";
import { gameEditSectionsFor } from "@repo/domain/game-edit-form";
import { gamePlayersLink } from "~/lib/game-player-links";
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
  CANCEL_GAME_ACTION,
  CLOSE_REGISTRATION_ACTION,
  EDIT_GAME_ACTION,
  GAME_TOAST,
  KICK_ACTION,
  LEAVE_GAME_ACTION,
  LEAVE_GAME_CONSEQUENCE,
  LEAVE_WAITLIST_ACTION,
  LEAVE_WAITLIST_CONSEQUENCE,
  REOPEN_REGISTRATION_ACTION,
  cancelGameConsequence,
  gameJoinToast,
  kickedToast,
} from "@repo/domain/game-copy";
import {
  ADD_PLAYER_ACTION,
  organizerCanAddPlayer,
} from "@repo/domain/add-player-by-phone";
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
import { gameCustomName } from "@repo/domain/game-custom-name";
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
  const autoJoined = React.useRef(false);

  const board = api.games.footballBoard.useQuery({ gameId });
  const players = board.data?.players ?? [];
  const teams = board.data?.teams ?? null;
  const names = teams ? bibNames(teams.bibs) : null;
  const viewer = players.find((player) => player.isViewer) ?? null;

  const input: FootballGameDetailsInput = {
    ...game,
    roster: game.roster ?? { users: [], count: 0, cap: game.playersAllowed },
  };
  const model = footballGameDetailsModel(input, now);
  const played = gameIsPlayed(
    { windowEnd: game.windowEnd, matches: game.matches },
    now,
  );
  const price = formatPricePerPlayerFils(game.pricePerPlayerFils);
  const layout = poolLayout(players, game.sideSize, game.playersAllowed);
  const lines = footballHeroLines(
    {
      windowStart: game.windowStart,
      windowEnd: game.windowEnd,
      cancelledAt: game.cancelledAt,
      sideSize: game.sideSize,
      venueName: game.venue?.name ?? null,
      pitchName: game.recordedCourts[0]?.name ?? null,
      teamsSet: teams != null,
      scored: board.data?.match?.score != null,
    },
    now,
  );

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
      toast.success(gameJoinToast(result.waitlisted));
      await refreshGame();
    },
  });
  const setRole = api.games.setFootballRole.useMutation({
    onSuccess: async () => {
      setJoinMode(null);
      toast.success("Saved");
      await refreshGame();
    },
  });
  const confirmScore = api.games.confirmMatchResult.useMutation({
    onSuccess: async () => {
      toast.success("Score confirmed");
      await refreshGame();
    },
    onError,
  });
  const leave = api.games.leave.useMutation({
    onSuccess: async () => {
      toast.success(GAME_TOAST.left);
      await refreshGame();
    },
    onError,
  });
  const leaveWaitlist = api.games.leaveWaitlist.useMutation({
    onSuccess: async () => {
      toast.success(GAME_TOAST.leftWaitlist);
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
      toast.success(GAME_TOAST.gameCancelled);
      await refreshGame();
    },
    onError,
  });
  const closeRegistration = api.games.closeRegistration.useMutation({
    onSuccess: async () => {
      toast.success(GAME_TOAST.registrationClosed);
      await refreshGame();
    },
    onError,
  });
  const reopenRegistration = api.games.reopenRegistration.useMutation({
    onSuccess: async () => {
      toast.success(GAME_TOAST.registrationReopened);
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
    onSaved: refreshGame,
    onClose: () => setEditOpen(false),
  });

  const inviteAccess = gameInviteAccess({
    friendlyChrome: false,
    isOrganizer: game.isOrganizer,
    registrationStatus: game.registrationStatus,
    cancelledAt: game.cancelledAt,
    joinFrozen: game.joinFrozen,
    registrationMode: game.registrationMode,
    partnerRequired: false,
  });
  function inviteShareText(url: string) {
    return gameInviteClipboardText({
      format: game.format,
      registrationMode: game.registrationMode,
      shortUrl: url,
      sport: game.sport,
      roster: {
        customName: savedCustomName,
        venueName: game.venue?.name ?? "Venue",
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
      ),
    );
  }

  const kickCopy = kickConfirm
    ? gameKickConfirmCopy(kickConfirm, {
        partnerRequired: false,
        drawPosted: false,
      })
    : null;
  const gameName = game.name ?? "Game";
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
  const canMakeTeams = board.data?.viewer.canMakeTeams ?? false;
  const viewerCode = viewer ? slotCode(viewer) : null;
  const heroMuted =
    model.hero.tone === "ink" ? "text-dim" : "text-muted-foreground";
  const joinSubtitle = [
    lines.dayLine,
    game.sideSize ? `${game.sideSize}-a-side` : null,
    `${layout.openSeats} seats open`,
  ]
    .filter(Boolean)
    .join(", ");
  const infoRows: FootballInfoRow[] = [
    ...(game.groupName ? [{ label: "Group", value: game.groupName }] : []),
    ...(game.season ? [{ label: "Season", value: game.season.name }] : []),
    ...(price
      ? [
          {
            label: "Pitch cost",
            value: price === "Free" ? price : `${price} each`,
          },
        ]
      : []),
    {
      label: "Teams",
      value: teams
        ? footballTeamsMethodLabel(teams.method)
        : "The organizer makes them",
    },
    ...(names
      ? [
          {
            label: "Bibs",
            value: `${names.slot1} and ${names.slot2}, organizer brings`,
          },
        ]
      : []),
    { label: "Counts for rating", value: game.rated ? "Yes" : "No" },
  ];
  const onInk = model.hero.tone === "ink";

  const heroActions = (
    <div className="mt-4 space-y-2">
      {cta?.kind === "join" ? (
        <Button
          type="button"
          size="lg"
          variant={onInk ? "inverse" : "default"}
          className="w-full"
          onClick={() => {
            register.reset();
            setJoinMode("join");
          }}
        >
          {price && price !== "Free" ? `Join, ${price}` : "Join"}
        </Button>
      ) : null}
      {cta?.kind === "join_waitlist" ? (
        <Button
          type="button"
          size="lg"
          variant={onInk ? "inverse" : "default"}
          className="w-full"
          pending={register.isPending}
          onClick={() => register.mutate({ gameId })}
        >
          Join waitlist
        </Button>
      ) : null}
      {cta?.kind === "registered" ? (
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 font-semibold">
            {viewerCode ? `You're in as ${viewerCode}` : "You're in"}
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
              Change
            </Button>
          ) : null}
          {played ? null : (
            <Button
              type="button"
              size="sm"
              variant={onInk ? "outline-inverse" : "outline"}
              onClick={() => setLeaveOpen(true)}
            >
              {LEAVE_GAME_ACTION}
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
            {LEAVE_WAITLIST_ACTION}
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
          Invite players
        </Button>
      ) : null}
    </div>
  );

  const heroBody =
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
            ),
            "Captains pick starters before kick-off.",
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
              <p className={`${heroMuted} text-meta`}>Players in</p>
              <p className="flex items-baseline gap-1.5">
                <span className="font-expanded text-display tabular-nums leading-none">
                  {players.length}
                </span>
                <span className={heroMuted}>of {layout.seats}</span>
              </p>
            </div>
            <p className={`${heroMuted} text-meta text-right`}>
              Teams by the organizer
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

  const score = board.data?.match?.score ?? null;
  const playedModel =
    teams && names && score && board.data?.match?.status === "completed"
      ? playedFootballModel({
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
        })
      : null;
  const canAddPlayer = organizerCanAddPlayer(game);
  const menu = organizer ? (
    <ActionMenu
      label="Game actions"
      triggerClassName={
        playedModel || model.hero.tone === "ink"
          ? ACTION_MENU_INK_BOXED_TRIGGER
          : ACTION_MENU_PAPER_BOXED_TRIGGER
      }
    >
      <ActionMenuItem onSelect={() => setEditOpen(true)}>
        {EDIT_GAME_ACTION}
      </ActionMenuItem>
      {canMakeTeams ? (
        <ActionMenuItem asChild>
          <Link href={teamsHref}>{teams ? "Edit teams" : "Make teams"}</Link>
        </ActionMenuItem>
      ) : null}
      {organizer.registration === "reopen" ? (
        <ActionMenuItem
          disabled={game.joinFrozen || reopenRegistration.isPending}
          onSelect={() => reopenRegistration.mutate({ gameId })}
        >
          {REOPEN_REGISTRATION_ACTION}
        </ActionMenuItem>
      ) : (
        <ActionMenuItem
          disabled={closeRegistration.isPending}
          onSelect={() => closeRegistration.mutate({ gameId })}
        >
          {CLOSE_REGISTRATION_ACTION}
        </ActionMenuItem>
      )}
      {inviteAccess.canManage ? (
        <ActionMenuItem onSelect={() => setInvitesOpen(true)}>
          Invite
        </ActionMenuItem>
      ) : null}
      {canAddPlayer ? (
        <ActionMenuItem onSelect={() => setAddPlayerOpen(true)}>
          {ADD_PLAYER_ACTION}
        </ActionMenuItem>
      ) : null}
      <ActionMenuSeparator />
      <ActionMenuItem
        variant="destructive"
        onSelect={() => setCancelOpen(true)}
      >
        {organizer.cancelLabel}
      </ActionMenuItem>
    </ActionMenu>
  ) : null;

  return (
    <DashboardShell
      title="Game"
      hidePageHeader
      hideMobileTopBar
      isSubPage={true}
      hideNav={true}
    >
      <div
        className={cn(
          "space-y-6",
          (game.cancelledAt != null || game.joinFrozen) && "max-md:pt-4",
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
                This Game is cancelled
              </p>
            </div>
          </section>
        ) : null}
        {game.joinFrozen && !game.cancelledAt ? (
          <SoftArchiveBanner
            headingLevel={2}
            heading="This Club Group's Community is Soft-archived"
          >
            Registration, the waitlist, and invites stay closed.
          </SoftArchiveBanner>
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
            actions={menu}
          >
            {heroBody}
          </FootballGameHeroCard>
        )}

        {board.error ? (
          <p role="alert" className="text-destructive text-meta">
            The lineup could not be loaded. {board.error.message}
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
            <p className="text-muted-foreground text-meta">
              Positions are preferences, not promises. The organizer makes the
              teams, with a keeper on each side.
            </p>
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
              <h2 className="font-medium">Teams</h2>
              <p className="text-muted-foreground text-meta">
                {teams
                  ? footballTeamsMethodLabel(teams.method)
                  : "Not set yet. Split the pool when it fills."}
              </p>
            </div>
            <Button asChild>
              <Link href={teamsHref}>
                {teams ? "Edit teams" : "Make teams"}
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
              Waitlist
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
                      aria-label={`${KICK_ACTION} ${entry.name}`}
                      onClick={() => requestKick({ waitlistId: entry.id })}
                    >
                      {KICK_ACTION}
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
        teamsLine={teams ? "Set" : "Made by the organizer"}
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
            subtitle: gameInviteSubtitle({
              windowStart: game.windowStart,
              courtName: game.recordedCourts[0]?.name ?? null,
              venueName: game.venue?.name ?? null,
              sides: [],
            }),
            shareMessage: inviteShareText,
          }}
          open={invitesOpen}
          onOpenChange={setInvitesOpen}
        />
      ) : null}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={`Cancel ${gameName}?`}
        description={cancelGameConsequence(model.rosterRows.length)}
        confirmLabel={CANCEL_GAME_ACTION}
        pending={cancel.isPending}
        onConfirm={async () => {
          await cancel.mutateAsync({ gameId });
        }}
      />
      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title={`Leave ${gameName}?`}
        description={LEAVE_GAME_CONSEQUENCE}
        confirmLabel={LEAVE_GAME_ACTION}
        pending={leave.isPending}
        onConfirm={async () => {
          await leave.mutateAsync({ gameId });
        }}
      />
      <ConfirmDialog
        open={leaveWaitlistOpen}
        onOpenChange={setLeaveWaitlistOpen}
        title={`${LEAVE_WAITLIST_ACTION}?`}
        description={LEAVE_WAITLIST_CONSEQUENCE}
        confirmLabel={LEAVE_WAITLIST_ACTION}
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
        title={kickCopy?.title ?? "Kick player?"}
        description={kickCopy?.description}
        confirmLabel={KICK_ACTION}
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
          toast.success(kickedToast(kickConfirm.name));
        }}
      />
    </DashboardShell>
  );
}
