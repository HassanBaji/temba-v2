import {
  footballGameDetailsModel,
  type FootballGameDetailsInput,
} from "@repo/domain/football-game-details";
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
import { useRouter, useSegments } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useNow } from "../games/use-now";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { InviteEntry } from "../invites/invite-entry";
import { gamePlayersLink } from "../player-profile/game-player-links";
import { playerPath } from "../player-profile/player-path";
import { Screen } from "../primitives/screen";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api, type RouterOutputs } from "../trpc/react";
import { ConfirmSheet, type ConfirmRequest } from "./confirm-sheet";
import { gameTitle } from "./details-model";
import { FootballBar } from "./football-bar";
import { FootballHero } from "./football-hero";
import { FootballOrganizerCard } from "./football-organizer-card";
import {
  FootballOrganizerSheets,
  type FootballEditSection,
} from "./football-organizer-sheets";
import { FootballRosterCard } from "./football-roster-card";

type FootballGame = RouterOutputs["games"]["byId"];

const SECTION_GAP = 16;

export function FootballGameDetails({
  gameId,
  game,
  refreshing,
  onRefresh,
}: {
  gameId: string;
  game: FootballGame;
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

  const input: FootballGameDetailsInput = {
    ...game,
    roster: game.roster ?? { users: [], count: 0, cap: game.playersAllowed },
  };
  const model = footballGameDetailsModel(input, now);

  const refresh = () =>
    Promise.all([
      utils.games.byId.invalidate({ id: gameId }),
      utils.games.listMyGames.invalidate(),
      utils.games.listPublicPickup.invalidate(),
      utils.users.home.invalidate(),
    ]);
  const failure = (error: { message: string }) => toast.show(error.message);
  const settled = async () => {
    setConfirm(null);
    await refresh();
  };

  const register = api.games.register.useMutation({
    onSuccess: (result) => toast.show(gameJoinToast(result.waitlisted)),
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

  function onCta() {
    switch (model.cta?.kind) {
      case "join":
      case "join_waitlist":
        register.mutate({ gameId });
        return;
      case "registered":
        askLeave();
        return;
      case "waitlisted":
        askLeaveWaitlist();
        return;
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
  const inviteEntry = inviteAccess.canManage ? (
    <InviteEntry onPress={() => setInviteOpen(true)} />
  ) : null;
  const onOpenPlayer = gamePlayersLink(game)
    ? (userId: string) => router.push(playerPath(segments, userId))
    : undefined;

  return (
    <View style={{ flex: 1 }}>
      <Screen
        refreshing={refreshing}
        onRefresh={onRefresh}
        statusBarTone={model.hero.tone}
        header={
          <FootballHero
            hero={model.hero}
            fallback="/games"
            actions={inviteEntry}
          />
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
          <FootballRosterCard
            rows={model.rosterRows}
            openSpots={model.openSpots}
            count={input.roster.count}
            cap={input.roster.cap}
            onOpenPlayer={onOpenPlayer}
            onKick={(userId) => askKick({ userId })}
          />
          {model.organizer ? (
            <FootballOrganizerCard
              organizer={model.organizer}
              waitlist={model.waitlistRows}
              playersAllowed={game.playersAllowed}
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
              }}
            />
          ) : null}
        </View>
      </Screen>
      {model.cta ? (
        <FootballBar
          cta={model.cta}
          pending={
            register.isPending || leave.isPending || leaveWaitlist.isPending
          }
          onAction={onCta}
        />
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
