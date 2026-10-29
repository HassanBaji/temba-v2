import { organizerCanAddPlayer } from "@repo/domain/add-player-by-phone";
import {
  footballGameDetailsModel,
  type FootballGameDetailsInput,
} from "@repo/domain/football-game-details";
import {
  footballTeamsMethodLabel,
  keepersInLine,
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import {
  GAME_TOAST,
  LEAVE_GAME_ACTION,
  LEAVE_GAME_CONSEQUENCE,
  LEAVE_WAITLIST_ACTION,
  LEAVE_WAITLIST_CONSEQUENCE,
  KICK_ACTION,
  cancelGameConsequence,
  gameJoinToast,
  kickedToast,
} from "@repo/domain/game-copy";
import {
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRequest,
} from "@repo/domain/game-kick-confirm";
import { gameInviteAccess } from "@repo/domain/invites";
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
import { PoolGrid } from "../football/pool-grid";
import { FootballScoreCard } from "../football/score-card";
import { TeamColumns } from "../football/team-columns";
import { useNow } from "../games/use-now";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { InviteEntry } from "../invites/invite-entry";
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
import {
  FootballOrganizerSheets,
  type FootballEditSection,
} from "./football-organizer-sheets";

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
  const router = useRouter();
  const segments = useSegments();
  const toast = useToast();
  const utils = api.useUtils();
  const now = useNow();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [section, setSection] = useState<FootballEditSection | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [joinMode, setJoinMode] = useState<"join" | "edit" | null>(null);
  const [selected, setSelected] = useState<BoardPlayer | null>(null);
  const autoJoined = useRef(false);

  const board = api.games.footballBoard.useQuery(
    { gameId },
    REFETCH_ON_FOREGROUND,
  );
  const players = board.data?.players ?? [];
  const teams = board.data?.teams ?? null;
  const names = teams ? bibNames(teams.bibs) : null;
  const viewer = players.find((player) => player.isViewer) ?? null;
  const preferences = api.users.onboardingState.useQuery().data;

  const input: FootballGameDetailsInput = {
    ...game,
    roster: game.roster ?? { users: [], count: 0, cap: game.playersAllowed },
  };
  const model = footballGameDetailsModel(input, now);
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
      toast.show(gameJoinToast(result.waitlisted));
    },
    onSettled: refresh,
  });
  const setRole = api.games.setFootballRole.useMutation({
    onSuccess: () => {
      setJoinMode(null);
      toast.show("Saved");
    },
    onSettled: refresh,
  });
  const confirmScore = api.games.confirmMatchResult.useMutation({
    onSuccess: () => toast.show("Score confirmed"),
    onError: failure,
    onSettled: refresh,
  });
  const leave = api.games.leave.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.left),
    onError: failure,
    onSettled: settled,
  });
  const leaveWaitlist = api.games.leaveWaitlist.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.leftWaitlist),
    onError: failure,
    onSettled: settled,
  });
  const kick = api.games.kick.useMutation({
    onError: failure,
    onSettled: settled,
  });
  const cancel = api.games.cancel.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.gameCancelled),
    onError: failure,
    onSettled: settled,
  });
  const closeRegistration = api.games.closeRegistration.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.registrationClosed),
    onError: failure,
    onSettled: refresh,
  });
  const reopenRegistration = api.games.reopenRegistration.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.registrationReopened),
    onError: failure,
    onSettled: refresh,
  });
  const updateWindow = api.games.updateWindow.useMutation({
    onSuccess: () => {
      toast.show("Window saved");
      setSection("menu");
    },
    onSettled: refresh,
  });
  const updatePrice = api.games.updatePricePerPlayer.useMutation({
    onSuccess: () => {
      toast.show("Price per player saved");
      setSection("menu");
    },
    onSettled: refresh,
  });
  const updateCaps = api.games.updateCaps.useMutation({
    onSuccess: () => {
      toast.show("Players allowed saved");
      setSection("menu");
    },
    onSettled: refresh,
  });

  useEffect(() => {
    if (openJoin && !autoJoined.current && model.cta?.kind === "join") {
      autoJoined.current = true;
      setJoinMode("join");
    }
  }, [openJoin, model.cta?.kind]);

  function askLeave() {
    setConfirm({
      title: `Leave ${gameTitle(game.name)}?`,
      description: LEAVE_GAME_CONSEQUENCE,
      confirmLabel: LEAVE_GAME_ACTION,
      onConfirm: () => leave.mutate({ gameId }),
    });
  }

  function askLeaveWaitlist() {
    setConfirm({
      title: `${LEAVE_WAITLIST_ACTION}?`,
      description: LEAVE_WAITLIST_CONSEQUENCE,
      confirmLabel: LEAVE_WAITLIST_ACTION,
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
    );
    const copy = gameKickConfirmCopy(target, {
      partnerRequired: false,
      drawPosted: false,
    });
    setSelected(null);
    setConfirm({
      title: copy.title,
      description: copy.description,
      confirmLabel: KICK_ACTION,
      onConfirm: () =>
        kick.mutate(
          target.kind === "player"
            ? { gameId, userId: target.userId }
            : { gameId, waitlistId: target.waitlistId },
          { onSuccess: () => toast.show(kickedToast(target.name)) },
        ),
    });
  }

  function askCancel() {
    setConfirm({
      title: `Cancel ${gameTitle(game.name)}?`,
      description: cancelGameConsequence(model.rosterRows.length),
      confirmLabel: model.organizer?.cancelLabel ?? "Cancel Game",
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
    router.push(playerPath(segments, userId));
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
    game.sideSize ? `${game.sideSize}-a-side` : null,
    `${layout.openSeats} seats open`,
  ]
    .filter(Boolean)
    .join(", ");

  const infoRows: InfoRow[] = [
    ...(game.groupName ? [{ label: "Group", value: game.groupName }] : []),
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

  const heroActions = (
    <View style={{ gap: 8 }}>
      {model.cta?.kind === "join" ? (
        <Button
          label={price && price !== "Free" ? `Join, ${price}` : "Join"}
          size="lg"
          onPress={() => {
            register.reset();
            setJoinMode("join");
          }}
        />
      ) : null}
      {model.cta?.kind === "join_waitlist" ? (
        <Button
          label="Join waitlist"
          size="lg"
          pending={register.isPending}
          onPress={() => register.mutate({ gameId })}
        />
      ) : null}
      {model.cta?.kind === "registered" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text weight="semibold">
              {viewerCode ? `You're in as ${viewerCode}` : "You're in"}
            </Text>
          </View>
          {board.data?.match?.score == null ? (
            <Button
              label="Change"
              variant="outline-inverse"
              size="sm"
              onPress={() => {
                setRole.reset();
                setJoinMode("edit");
              }}
            />
          ) : null}
          <Button
            label={LEAVE_GAME_ACTION}
            variant="outline-inverse"
            size="sm"
            pending={leave.isPending}
            onPress={askLeave}
          />
        </View>
      ) : null}
      {model.cta?.kind === "waitlisted" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text weight="semibold">{model.cta.title}</Text>
          </View>
          <Button
            label={LEAVE_WAITLIST_ACTION}
            variant="outline-inverse"
            size="sm"
            pending={leaveWaitlist.isPending}
            onPress={askLeaveWaitlist}
          />
        </View>
      ) : null}
      {inviteAccess.canManage && !teams ? (
        <Button
          label="Invite players"
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
            ),
            "Captains pick starters before kick-off.",
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
              Players in
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}
            >
              <Text size="display" width="expanded" weight="bold">
                {String(players.length)}
              </Text>
              <Text tone="muted">of {layout.seats}</Text>
            </View>
          </View>
          <Text size="meta" tone="muted" style={{ textAlign: "right" }}>
            Teams by the organizer
          </Text>
        </View>
        <SeatBar seats={layout.seats} filled={players.length} />
        {heroActions}
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <Screen
        refreshing={refreshing}
        onRefresh={() => {
          onRefresh();
          void board.refetch();
        }}
        statusBarTone={model.hero.tone}
        header={
          <FootballHero
            tone={model.hero.tone}
            lines={lines}
            fallback="/games"
            actions={
              inviteAccess.canManage ? (
                <InviteEntry onPress={() => setInviteOpen(true)} />
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
                This Game is cancelled
              </Text>
            </Surface>
          ) : null}
          {game.joinFrozen && !game.cancelledAt ? (
            <Surface style={{ gap: 4 }}>
              <Text size="lead" weight="semibold" accessibilityRole="header">
                This Club Group&apos;s Community is Soft-archived
              </Text>
              <Text size="meta" tone="muted">
                Registration, the waitlist, and invites stay closed.
              </Text>
            </Surface>
          ) : null}
          {board.error ? (
            <Surface accessibilityRole="alert" style={{ gap: 8 }}>
              <Text weight="semibold">The lineup could not be loaded</Text>
              <Text size="meta" tone="muted">
                {board.error.message}
              </Text>
            </Surface>
          ) : null}
          {!teams ? (
            <View style={{ gap: 12 }}>
              <SectionHead
                title="Players"
                meta={keepersInLine(
                  players.filter((row) => row.role === "keeper").length,
                )}
              />
              {players.length === 0 && layout.openSeats === 0 ? (
                <Text size="meta" tone="muted">
                  Nobody has joined yet.
                </Text>
              ) : (
                <PoolGrid
                  players={layout.pool}
                  open={layout.openSeats}
                  onOpenPlayer={onPressPlayer}
                />
              )}
              <Text size="meta" tone="muted">
                Positions are preferences, not promises. The organizer makes the
                teams, with a keeper on each side.
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
                        ? footballTeamsMethodLabel(teams.method)
                        : "Not set yet. Split the pool when it fills.",
                      actionLabel: teams ? "Edit teams" : "Make teams",
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
                onChangeCap: () => setSection("cap"),
                onEdit: () => setSection("menu"),
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
              format: game.format,
              sport: game.sport,
              registrationMode: game.registrationMode,
              venueName: game.venue?.name ?? null,
              courtName: game.recordedCourts[0]?.name ?? null,
              windowStart: game.windowStart,
              windowEnd: game.windowEnd,
              sides: [],
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
        teamsLine={teams ? "Set" : "Made by the organizer"}
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
        <FootballOrganizerSheets
          section={section}
          onSection={setSection}
          game={game}
          capBounds={model.organizer.capBounds}
          now={now}
          pending={{
            window: updateWindow.isPending,
            price: updatePrice.isPending,
            cap: updateCaps.isPending,
          }}
          errors={{
            window: updateWindow.error?.message ?? null,
            price: updatePrice.error?.message ?? null,
            cap: updateCaps.error?.message ?? null,
          }}
          onSaveWindow={(window) => {
            updateWindow.reset();
            updateWindow.mutate({ gameId, ...window });
          }}
          onSavePrice={(fils) => {
            updatePrice.reset();
            updatePrice.mutate({ gameId, pricePerPlayerFils: fils });
          }}
          onSaveCap={(playersAllowed) => {
            updateCaps.reset();
            updateCaps.mutate({ gameId, playersAllowed });
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
