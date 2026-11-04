import { organizerCanAddPlayer } from "@repo/domain/add-player-by-phone";
import { gameCustomName } from "@repo/domain/game-custom-name";
import { gameEditSectionsFor } from "@repo/domain/game-edit-form";
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
  gameJoinToast,
  gameToast,
  kickAction,
  kickedToast,
  leaveGameAction,
  leaveGameConsequence,
  leaveWaitlistAction,
  leaveWaitlistConsequence,
} from "@repo/domain/game-copy";
import {
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRequest,
} from "@repo/domain/game-kick-confirm";
import { gameInviteAccess } from "@repo/domain/invites";
import {
  gameIsPlayed,
  playedFootballModel,
  type PlayedRow,
} from "@repo/domain/played-game";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { useRouter, useSegments, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import {
  bibNames,
  footballHeroLines,
  poolLayout,
  slotCode,
  viewerSideLine,
  type BoardPlayer,
} from "@repo/domain/football-board";
import { InfoRows, type InfoRow } from "../football/info-rows";
import { FootballJoinSheet } from "../football/join-sheet";
import { PlayerSheet } from "../football/player-sheet";
import { PoolSections } from "../football/pool-grid";
import { FootballScoreCard } from "../football/score-card";
import { TeamColumns } from "../football/team-columns";
import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { InviteIconEntry } from "../invites/invite-entry";
import { PlayedFootballBoard } from "../played-game/played-football-board";
import { sharePath } from "../played-game/played-friendly-game";
import { PlayedGameView } from "../played-game/played-game-view";
import { PlayedMenuSheet } from "../played-game/played-menu-sheet";
import { PlayedPlayerSheet } from "../played-game/played-player-sheet";
import { gamePlayersLink } from "../player-profile/game-player-links";
import { playerPath } from "../player-profile/player-path";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api, type RouterOutputs } from "../trpc/react";
import { AddPlayerSheet } from "./add-player-sheet";
import { ConfirmSheet, type ConfirmRequest } from "./confirm-sheet";
import { gameTitle } from "./details-model";
import { FootballHero, SeatBar } from "./football-hero";
import { FootballOrganizerCard } from "./football-organizer-card";
import { GameEditSheet } from "./game-edit-sheet";
import { useGameEdit } from "./use-game-edit";

type FootballGame = RouterOutputs["games"]["byId"];

const SECTION_GAP = 16;
const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="title" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
      {meta ? (
        <Text size="meta" tone="muted">
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

export function FootballGameDetails({
  gameId,
  game,
  openJoin,
  refreshing,
  onRefresh,
}: {
  gameId: string;
  game: FootballGame;
  openJoin: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const m = useMessages();
  const copy = m.mobileGameDetails;
  const locale = useLocale();
  const router = useRouter();
  const segments = useSegments();
  const toast = useToast();
  const utils = api.useUtils();
  const now = useNow();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [joinMode, setJoinMode] = useState<"join" | "edit" | null>(null);
  const [selected, setSelected] = useState<BoardPlayer | null>(null);
  const [playedMenuOpen, setPlayedMenuOpen] = useState(false);
  const [playedSelected, setPlayedSelected] = useState<PlayedRow | null>(null);
  const autoJoined = useRef(false);

  const board = api.games.footballBoard.useQuery(
    { gameId },
    REFETCH_ON_FOREGROUND,
  );
  const players = board.data?.players ?? [];
  const teams = board.data?.teams ?? null;
  const names = teams ? bibNames(teams.bibs, locale) : null;
  const viewer = players.find((player) => player.isViewer) ?? null;
  const preferences = api.users.onboardingState.useQuery().data;

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
    locale,
  );

  const refresh = () =>
    Promise.all([
      utils.games.byId.invalidate({ id: gameId }),
      utils.games.footballBoard.invalidate({ gameId }),
      utils.games.listMyGames.invalidate(),
      utils.games.listPublicPickup.invalidate(),
      utils.users.home.invalidate(),
    ]);
  const failure = (error: { message: string }) => toast.show(error.message);
  const settled = async () => {
    setConfirm(null);
    setSelected(null);
    await refresh();
  };

  const register = api.games.register.useMutation({
    onSuccess: (result) => {
      setJoinMode(null);
      toast.show(gameJoinToast(result.waitlisted, locale));
    },
    onSettled: refresh,
  });
  const setRole = api.games.setFootballRole.useMutation({
    onSuccess: () => {
      setJoinMode(null);
      toast.show(m.common.saved);
    },
    onSettled: refresh,
  });
  const confirmScore = api.games.confirmMatchResult.useMutation({
    onSuccess: () => toast.show(copy.toast.scoreConfirmed),
    onError: failure,
    onSettled: refresh,
  });
  const leave = api.games.leave.useMutation({
    onSuccess: () => toast.show(gameToast(locale).left),
    onError: failure,
    onSettled: settled,
  });
  const leaveWaitlist = api.games.leaveWaitlist.useMutation({
    onSuccess: () => toast.show(gameToast(locale).leftWaitlist),
    onError: failure,
    onSettled: settled,
  });
  const kick = api.games.kick.useMutation({
    onError: failure,
    onSettled: settled,
  });
  const cancel = api.games.cancel.useMutation({
    onSuccess: () => toast.show(gameToast(locale).gameCancelled),
    onError: failure,
    onSettled: settled,
  });
  const closeRegistration = api.games.closeRegistration.useMutation({
    onSuccess: () => toast.show(gameToast(locale).registrationClosed),
    onError: failure,
    onSettled: refresh,
  });
  const reopenRegistration = api.games.reopenRegistration.useMutation({
    onSuccess: () => toast.show(gameToast(locale).registrationReopened),
    onError: failure,
    onSettled: refresh,
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
    onSaved: refresh,
    onClose: () => setEditOpen(false),
  });

  useEffect(() => {
    if (openJoin && !autoJoined.current && model.cta?.kind === "join") {
      autoJoined.current = true;
      setJoinMode("join");
    }
  }, [openJoin, model.cta?.kind]);

  function askLeave() {
    setConfirm({
      title: copy.confirm.leaveTitle(gameTitle(game.name, locale)),
      description: leaveGameConsequence(locale),
      confirmLabel: leaveGameAction(locale),
      onConfirm: () => leave.mutate({ gameId }),
    });
  }

  function askLeaveWaitlist() {
    setConfirm({
      title: copy.confirm.leaveWaitlistTitle(leaveWaitlistAction(locale)),
      description: leaveWaitlistConsequence(locale),
      confirmLabel: leaveWaitlistAction(locale),
      onConfirm: () => leaveWaitlist.mutate({ gameId }),
    });
  }

  function askKick(request: GameKickRequest) {
    const target = gameKickTarget(
      {
        registeredPlayers: game.registeredPlayers,
        sides: [],
        waitlist: game.waitlist,
      },
      request,
      locale,
    );
    const kickCopy = gameKickConfirmCopy(
      target,
      { partnerRequired: false, drawPosted: false },
      locale,
    );
    setSelected(null);
    setConfirm({
      title: kickCopy.title,
      description: kickCopy.description,
      confirmLabel: kickAction(locale),
      onConfirm: () =>
        kick.mutate(
          target.kind === "player"
            ? { gameId, userId: target.userId }
            : { gameId, waitlistId: target.waitlistId },
          { onSuccess: () => toast.show(kickedToast(target.name, locale)) },
        ),
    });
  }

  function askCancel() {
    setConfirm({
      title: copy.confirm.cancelTitle(gameTitle(game.name, locale)),
      description: cancelGameConsequence(model.rosterRows.length, locale),
      confirmLabel: model.organizer?.cancelLabel ?? cancelGameAction(locale),
      onConfirm: () => cancel.mutate({ gameId }),
    });
  }

  function submitJoin(role: FootballRole, position: FootballPosition) {
    if (joinMode === "edit") {
      setRole.mutate({ gameId, role, position });
    } else {
      register.mutate({ gameId, football: { role, position } });
    }
  }

  const inviteAccess = gameInviteAccess({
    friendlyChrome: false,
    isOrganizer: game.isOrganizer,
    registrationStatus: game.registrationStatus,
    cancelledAt: game.cancelledAt,
    joinFrozen: game.joinFrozen,
    registrationMode: game.registrationMode,
    partnerRequired: false,
  });
  const canOpenProfile = gamePlayersLink(game);
  const openProfile = (userId: string) =>
    router.push(playerPath(segments, userId, "football"));
  const onPressPlayer = (userId: string) => {
    const player = players.find((row) => row.userId === userId);
    if (player && model.organizer && !player.isViewer) {
      setSelected(player);
    } else if (canOpenProfile) {
      openProfile(userId);
    }
  };
  const teamsPath = `/games/${gameId}/teams` as Href;
  const scorePath = `/games/${gameId}/score` as Href;
  const viewerCode = viewer ? slotCode(viewer) : null;
  const subtitle = [
    lines.dayLine,
    game.sideSize ? m.createGame.sideSize(game.sideSize) : null,
    m.football.board.seatsOpen(layout.openSeats),
  ]
    .filter(Boolean)
    .join(copy.listSeparator);

  const infoRows: InfoRow[] = [
    ...(game.groupName
      ? [{ label: copy.football.group, value: game.groupName }]
      : []),
    ...(game.season
      ? [{ label: copy.football.season, value: game.season.name }]
      : []),
    ...(price
      ? [
          {
            label: copy.football.pitchCost,
            value:
              price === m.createGame.price.free
                ? price
                : m.game.partner.priceEach(price),
          },
        ]
      : []),
    {
      label: copy.football.teams,
      value: teams
        ? footballTeamsMethodLabel(teams.method, locale)
        : copy.football.organizerMakesTeams,
    },
    ...(names
      ? [
          {
            label: copy.football.bibs,
            value: m.game.played.bibsLine(names.slot1, names.slot2),
          },
        ]
      : []),
    {
      label: m.game.partner.countsForRating,
      value: game.rated ? m.common.yes : m.common.no,
    },
  ];

  const heroActions = (
    <View style={{ gap: 8 }}>
      {model.cta?.kind === "join" ? (
        <Button
          label={
            price && price !== m.createGame.price.free
              ? m.football.board.joinWithPrice(m.game.cta.join, price)
              : m.game.cta.join
          }
          size="lg"
          onPress={() => {
            register.reset();
            setJoinMode("join");
          }}
        />
      ) : null}
      {model.cta?.kind === "join_waitlist" ? (
        <Button
          label={m.game.cta.joinWaitlist}
          size="lg"
          pending={register.isPending}
          onPress={() => register.mutate({ gameId })}
        />
      ) : null}
      {model.cta?.kind === "registered" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text weight="semibold">
              {viewerCode
                ? copy.football.youreInAs(viewerCode)
                : m.game.cta.youreIn}
            </Text>
          </View>
          {board.data?.match?.score == null && !played ? (
            <Button
              label={copy.football.change}
              variant="outline-inverse"
              size="sm"
              onPress={() => {
                setRole.reset();
                setJoinMode("edit");
              }}
            />
          ) : null}
          {played ? null : (
            <Button
              label={leaveGameAction(locale)}
              variant="outline-inverse"
              size="sm"
              pending={leave.isPending}
              onPress={askLeave}
            />
          )}
        </View>
      ) : null}
      {model.cta?.kind === "waitlisted" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text weight="semibold">{model.cta.title}</Text>
          </View>
          <Button
            label={leaveWaitlistAction(locale)}
            variant="outline-inverse"
            size="sm"
            pending={leaveWaitlist.isPending}
            onPress={askLeaveWaitlist}
          />
        </View>
      ) : null}
      {inviteAccess.canManage && !teams ? (
        <Button
          label={copy.football.invitePlayers}
          variant="outline-inverse"
          size="lg"
          onPress={() => setInviteOpen(true)}
        />
      ) : null}
    </View>
  );

  const heroBody =
    teams && names ? (
      <View style={{ gap: 12 }}>
        <TeamColumns
          players={players}
          bibs={teams.bibs}
          names={names}
          onOpenPlayer={onPressPlayer}
        />
        <Text size="meta" tone="muted">
          {[
            viewerSideLine(
              board.data?.viewer ?? { sideIndex: null },
              players,
              names,
              locale,
            ),
            copy.football.captainsNote,
          ]
            .filter(Boolean)
            .join(" ")}
        </Text>
        {heroActions}
      </View>
    ) : (
      <View style={{ gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          <View>
            <Text size="meta" tone="muted">
              {copy.football.playersIn}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}
            >
              <Text size="display" width="expanded" weight="bold">
                {String(players.length)}
              </Text>
              <Text tone="muted">{copy.football.ofSeats(layout.seats)}</Text>
            </View>
          </View>
          <Text size="meta" tone="muted" style={{ textAlign: "right" }}>
            {copy.football.teamsByOrganizer}
          </Text>
        </View>
        <SeatBar seats={layout.seats} filled={players.length} />
        {heroActions}
      </View>
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
  const playedMenuItems = organizerCanAddPlayer(game)
    ? [
        {
          key: "add_player",
          label: m.group.addPlayer.action,
          hint: m.group.addPlayer.description,
          onPress: () => setAddPlayerOpen(true),
        },
      ]
    : [];
  const refreshAll = () => {
    onRefresh();
    void board.refetch();
  };

  const screen = playedModel ? (
    <PlayedGameView
      hero={{
        dateLine: playedModel.dateLine,
        tag: playedModel.tag,
        result: playedModel.result,
        venueLine: playedModel.venueLine,
        whenLine: playedModel.whenLine,
        you: playedModel.you,
        avatar: viewer ? { name: viewer.name, image: viewer.image } : null,
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
      refreshing={refreshing}
      onRefresh={refreshAll}
      onShare={() => router.push(sharePath(gameId))}
      onMore={
        playedMenuItems.length > 0 ? () => setPlayedMenuOpen(true) : undefined
      }
      onPressPlayer={
        model.organizer || canOpenProfile ? setPlayedSelected : undefined
      }
    />
  ) : (
    <Screen
      refreshing={refreshing}
      onRefresh={refreshAll}
      statusBarTone={model.hero.tone}
      header={
        <FootballHero
          tone={model.hero.tone}
          lines={lines}
          actions={
            inviteAccess.canManage ? (
              <InviteIconEntry onPress={() => setInviteOpen(true)} />
            ) : null
          }
        >
          {heroBody}
        </FootballHero>
      }
    >
      <View style={{ gap: SECTION_GAP }}>
        {game.cancelledAt ? (
          <Surface accessibilityRole="alert">
            <Text size="title" weight="semibold">
              {copy.cancelledTitle}
            </Text>
          </Surface>
        ) : null}
        {game.joinFrozen && !game.cancelledAt ? (
          <Surface style={{ gap: 4 }}>
            <Text size="lead" weight="semibold" accessibilityRole="header">
              {copy.frozen.title}
            </Text>
            <Text size="meta" tone="muted">
              {copy.frozen.description}
            </Text>
          </Surface>
        ) : null}
        {board.error ? (
          <Surface accessibilityRole="alert" style={{ gap: 8 }}>
            <Text weight="semibold">{copy.football.lineupLoadFailed}</Text>
            <Text size="meta" tone="muted">
              {board.error.message}
            </Text>
          </Surface>
        ) : null}
        {!teams ? (
          <View style={{ gap: 12 }}>
            {players.length === 0 && layout.openSeats === 0 ? (
              <>
                <SectionHead title={copy.football.players} />
                <Text size="meta" tone="muted">
                  {copy.football.nobodyJoined}
                </Text>
              </>
            ) : (
              <PoolSections
                players={layout.pool}
                seats={layout.seats}
                onOpenPlayer={onPressPlayer}
              />
            )}
            <Text size="meta" tone="muted">
              {copy.football.positionsNote}
            </Text>
          </View>
        ) : null}
        {teams && names ? (
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
            onEnterScore={() => router.push(scorePath)}
            onConfirm={() => {
              const matchId = board.data?.match?.id;
              if (matchId) {
                confirmScore.mutate({ gameId, matchId });
              }
            }}
          />
        ) : null}
        <InfoRows rows={infoRows} />
        {model.organizer ? (
          <FootballOrganizerCard
            organizer={model.organizer}
            waitlist={model.waitlistRows}
            playersAllowed={game.playersAllowed}
            teams={
              board.data?.viewer.canMakeTeams
                ? {
                    status: teams
                      ? footballTeamsMethodLabel(teams.method, locale)
                      : copy.football.teamsNotSet,
                    actionLabel: teams
                      ? copy.football.editTeams
                      : copy.football.makeTeams,
                  }
                : null
            }
            handlers={{
              registrationPending:
                closeRegistration.isPending || reopenRegistration.isPending,
              cancelPending: cancel.isPending,
              onToggleRegistration: () =>
                model.organizer?.registration === "reopen"
                  ? reopenRegistration.mutate({ gameId })
                  : closeRegistration.mutate({ gameId }),
              onChangeCap: () => setEditOpen(true),
              onEdit: () => setEditOpen(true),
              onCancel: askCancel,
              onKickWaitlist: (waitlistId) => askKick({ waitlistId }),
              onAddPlayer: organizerCanAddPlayer(game)
                ? () => setAddPlayerOpen(true)
                : undefined,
              onMakeTeams: () => router.push(teamsPath),
            }}
          />
        ) : null}
      </View>
    </Screen>
  );

  return (
    <View style={{ flex: 1 }}>
      {screen}
      {playedModel ? (
        <>
          <PlayedMenuSheet
            visible={playedMenuOpen}
            title={gameTitle(game.name, locale)}
            items={playedMenuItems}
            onClose={() => setPlayedMenuOpen(false)}
          />
          <PlayedPlayerSheet
            player={playedSelected}
            canOpenProfile={canOpenProfile}
            canKick={
              model.organizer != null &&
              playedSelected != null &&
              !playedSelected.isYou
            }
            canRename={false}
            onClose={() => setPlayedSelected(null)}
            onOpenProfile={(userId) => {
              setPlayedSelected(null);
              openProfile(userId);
            }}
            onKick={(userId) => {
              setPlayedSelected(null);
              askKick({ userId });
            }}
            onRename={() => undefined}
          />
        </>
      ) : null}
      {inviteAccess.canManage ? (
        <InviteDoorSheet
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
          door={{
            kind: "game",
            gameId,
            canLookup: inviteAccess.canSendLookup,
            canLink: true,
            share: {
              customName: gameCustomName(game),
              format: game.format,
              sport: game.sport,
              registrationMode: game.registrationMode,
              venueName: game.venue?.name ?? null,
              courtName: game.recordedCourts[0]?.name ?? null,
              windowStart: game.windowStart,
              windowEnd: game.windowEnd,
              sides: [],
              football: {
                sideSize: game.sideSize,
                playersAllowed: game.playersAllowed,
                players,
              },
            },
          }}
        />
      ) : null}
      <FootballJoinSheet
        visible={joinMode != null}
        mode={joinMode ?? "join"}
        subtitle={subtitle}
        players={players}
        viewer={{
          role: viewer?.role ?? preferences?.preferredFootballRole ?? null,
          position:
            viewer?.position ?? preferences?.preferredFootballPosition ?? null,
        }}
        price={price}
        teamsLine={
          teams ? copy.football.teamsSet : copy.football.teamsMadeByOrganizer
        }
        pending={register.isPending || setRole.isPending}
        error={
          (joinMode === "edit" ? setRole.error : register.error)?.message ??
          null
        }
        onClose={() => setJoinMode(null)}
        onSubmit={submitJoin}
      />
      <PlayerSheet
        player={selected}
        canOpenProfile={canOpenProfile}
        onClose={() => setSelected(null)}
        onOpenProfile={(userId) => {
          setSelected(null);
          openProfile(userId);
        }}
        onRemove={(userId) => askKick({ userId })}
      />
      {model.organizer ? (
        <AddPlayerSheet
          visible={addPlayerOpen}
          onClose={() => setAddPlayerOpen(false)}
          gameId={gameId}
          placement="football"
          sides={[]}
          onAdded={refresh}
        />
      ) : null}
      {model.organizer ? (
        <GameEditSheet
          visible={editOpen}
          onClose={() => setEditOpen(false)}
          edit={edit}
          sections={editSections}
          context={{
            venueName: game.venue?.name ?? null,
            courtName: game.recordedCourts[0]?.name ?? null,
            groupName: game.groupName,
            joined: game.registeredUserCount,
            seasons: game.groupSeasons,
            canChangeSeason: game.canChangeSeason,
          }}
        />
      ) : null}
      <ConfirmSheet
        request={confirm}
        pending={
          leave.isPending ||
          leaveWaitlist.isPending ||
          kick.isPending ||
          cancel.isPending
        }
        onClose={() => setConfirm(null)}
      />
    </View>
  );
}
