import type { FriendlyGameDetails } from "@repo/domain/friendly-game-details";
import { friendlyGameHomeTitle } from "@repo/domain/friendly-game-chrome";
import {
  PARTNER_VACANT_SIDE_RACE_MESSAGE,
  isPartnerVacantSideRace,
  offersPartnerJoin,
  partnerVacantSideRaceRecovery,
} from "@repo/domain/friendly-game-partner";
import {
  GAME_TOAST,
  LEAVE_GAME_ACTION,
  LEAVE_WAITLIST_ACTION,
  LEAVE_WAITLIST_CONSEQUENCE,
  gameJoinToast,
} from "@repo/domain/game-copy";
import { SCORE_INCOMPLETE_MESSAGE } from "@repo/domain/friendly-game-score";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { LEVEL_RANGE_REQUEST_SENT_TOAST } from "@repo/domain/level-range-request";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";
import { tournamentLeaveOrKickConfirmCopy } from "@repo/domain/tournament-join";
import { Stack, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { slotOf } from "../lib/slot-of";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { ConfirmSheet, type ConfirmRequest } from "./confirm-sheet";
import {
  GameDetailsBar,
  GameDetailsContent,
  type DetailsHandlers,
} from "./details-content";
import {
  UNSUPPORTED_FORMAT_COPY,
  gameTitle,
  isFriendlyGameDetails,
} from "./details-model";
import { JoinSheet } from "./join-sheet";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

function Notice({
  title,
  description,
  onRetry,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <Surface accessibilityRole="alert" style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {title}
      </Text>
      {description ? (
        <Text size="meta" tone="muted">
          {description}
        </Text>
      ) : null}
      {onRetry ? (
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <Button label="Try again" variant="outline" onPress={onRetry} />
        </View>
      ) : null}
    </Surface>
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ gap: 16 }} accessibilityLabel="Loading Game">
      <Skeleton height={220} radius={16} />
      <Skeleton height={200} radius={16} />
      <Skeleton height={200} radius={16} />
    </View>
  );
}

export function GameDetailsScreen({ gameId }: { gameId: string }) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [partnerQuery, setPartnerQuery] = useState("");
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const game = api.games.byId.useQuery({ id: gameId }, REFETCH_ON_FOREGROUND);
  const data = game.data;
  const friendly = data != null && isFriendlyGameDetails(data);
  const offersPartner = Boolean(
    data &&
      offersPartnerJoin({
        canRegister: data.canRegister,
        format: data.format,
        registrationMode: data.registrationMode,
        sides: data.sides,
      }),
  );
  const joinQueriesOn = joinOpen && offersPartner;
  const onboarding = api.users.onboardingState.useQuery(undefined, {
    enabled: joinOpen,
  });
  const suggestions = api.games.listPartnerSuggestions.useQuery(
    { gameId },
    { enabled: joinQueriesOn },
  );
  const search = api.games.searchPartnerUsers.useQuery(
    { gameId, query: partnerQuery },
    { enabled: joinQueriesOn && partnerQuery.trim().length > 0 },
  );

  const refresh = useCallback(
    () =>
      Promise.all([
        utils.games.byId.invalidate({ id: gameId }),
        utils.games.listMyGames.invalidate(),
        utils.games.listMyMatchHistory.invalidate(),
        utils.users.home.invalidate(),
      ]),
    [utils, gameId],
  );

  const failure = (error: { message: string }) => toast.show(error.message);

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: (result) => {
      toast.show(gameJoinToast(result.waitlisted));
      setJoinOpen(false);
    },
    onError: (error) =>
      joinOpen ? setJoinError(error.message) : failure(error),
    onSettled: refresh,
  });
  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: (result) => {
      toast.show(gameJoinToast(result.waitlisted));
      setJoinOpen(false);
      setPartnerQuery("");
    },
    onError: async (error) => {
      if (
        !isPartnerVacantSideRace({
          message: error.message,
          data: { code: error.data?.code },
        })
      ) {
        setJoinError(error.message);
        return;
      }
      setJoinError(PARTNER_VACANT_SIDE_RACE_MESSAGE);
      const fresh = await utils.games.byId.fetch({ id: gameId });
      if (partnerVacantSideRaceRecovery(fresh.sides) === "game_home") {
        toast.show(PARTNER_VACANT_SIDE_RACE_MESSAGE);
        setJoinOpen(false);
      }
    },
    onSettled: refresh,
  });
  const moveSeat = api.games.moveSeat.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.seatChanged),
    onError: failure,
    onSettled: refresh,
  });
  const leaveGame = api.games.leave.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.left),
    onError: failure,
    onSettled: () => {
      setConfirm(null);
      return refresh();
    },
  });
  const leaveWaitlist = api.games.leaveWaitlist.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.leftWaitlist),
    onError: failure,
    onSettled: () => {
      setConfirm(null);
      return refresh();
    },
  });
  const scoreSet = api.games.scoreSet.useMutation();
  const confirmResult = api.games.confirmMatchResult.useMutation({
    onSuccess: () => toast.show("Result confirmed"),
    onError: failure,
    onSettled: async () => {
      await refresh();
      await utils.ratings.me.invalidate();
    },
  });
  const requestLevel = api.games.requestLevelRange.useMutation({
    onSuccess: () => toast.show(LEVEL_RANGE_REQUEST_SENT_TOAST),
    onError: failure,
    onSettled: refresh,
  });

  const firstMatchId = data?.matches[0]?.id;

  const saveSets = useCallback(
    async (
      payloads: {
        setId: string;
        slot1GamesWon: number;
        slot2GamesWon: number;
      }[],
    ) => {
      if (!firstMatchId) {
        return;
      }
      if (payloads.length === 0) {
        toast.show(SCORE_INCOMPLETE_MESSAGE);
        return;
      }
      try {
        for (const payload of payloads) {
          await scoreSet.mutateAsync({
            gameId,
            matchId: firstMatchId,
            ...payload,
          });
        }
        toast.show("Set saved");
      } catch (error) {
        toast.show(error instanceof Error ? error.message : "Could not save");
      } finally {
        await refresh();
      }
    },
    [firstMatchId, gameId, refresh, scoreSet, toast],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await game.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [game]);

  function openJoin() {
    registerSeat.reset();
    registerWithPartner.reset();
    setJoinError(null);
    setPartnerQuery("");
    setJoinOpen(true);
  }

  function askLeaveGame() {
    if (!data) {
      return;
    }
    setConfirm({
      title: `Leave ${gameTitle(data.name)}?`,
      description: tournamentLeaveOrKickConfirmCopy({
        partnerRequired: isPartnerRequiredGame(data),
        drawPosted: Boolean(data.drawPostedAt),
      }),
      confirmLabel: LEAVE_GAME_ACTION,
      onConfirm: () => leaveGame.mutate({ gameId }),
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

  const title = data
    ? friendlyGameHomeTitle(data.groupId, data.groupName)
    : "Game";
  const header = (
    <Stack.Screen
      options={{
        title,
        headerTitle: () => <Text weight="semibold">{title}</Text>,
      }}
    />
  );

  if (isNotFoundError(game.error)) {
    return (
      <Screen>
        {header}
        <Notice
          title="Game not found"
          description="It may have been removed, or you may not have access."
        />
      </Screen>
    );
  }

  if (game.error && !data) {
    return (
      <Screen>
        {header}
        <Notice
          title="Game could not be loaded"
          description={game.error.message}
          onRetry={() => void game.refetch()}
        />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        {header}
        <LoadingSkeleton />
      </Screen>
    );
  }

  if (!friendly) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          title={UNSUPPORTED_FORMAT_COPY.title}
          description={UNSUPPORTED_FORMAT_COPY.description}
        />
      </Screen>
    );
  }

  const details: FriendlyGameDetails = data;
  const handlers: DetailsHandlers = {
    movePending: moveSeat.isPending,
    scorePending: scoreSet.isPending,
    confirmPending: confirmResult.isPending,
    levelRequestPending: requestLevel.isPending,
    footerPendingKind: leaveGame.isPending ? "leave_game" : null,
    onMove: (sideIndex, position) =>
      moveSeat.mutate({ gameId, sideIndex, position }),
    onSaveSets: (payloads) => void saveSets(payloads),
    onConfirm: () =>
      firstMatchId && confirmResult.mutate({ gameId, matchId: firstMatchId }),
    onRequestLevel: () => requestLevel.mutate({ gameId }),
    onFooterAction: (kind) => {
      if (kind === "leave_game") {
        askLeaveGame();
      }
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <GameDetailsContent game={details} handlers={handlers} />
      </Screen>
      <GameDetailsBar
        game={details}
        handlers={{
          joinPending: registerSeat.isPending && !joinOpen,
          leaveWaitlistPending: leaveWaitlist.isPending,
          onJoin: openJoin,
          onJoinWaitlist: () => registerSeat.mutate({ gameId }),
          onLeaveWaitlist: askLeaveWaitlist,
          onBrowse: () => router.push("/games"),
        }}
      />
      <JoinSheet
        visible={joinOpen}
        onClose={() => setJoinOpen(false)}
        game={{
          title: gameTitle(data.name),
          sides: data.sides,
          pricePerPlayerFils: data.pricePerPlayerFils,
          windowStart: data.windowStart,
          venueName: data.venue?.name ?? null,
          isOrganizer: data.isOrganizer,
          levelMinTenths: data.levelMinTenths,
          levelMaxTenths: data.levelMaxTenths,
          offersPartner,
        }}
        preferredPosition={onboarding.data?.preferredPosition ?? null}
        seatPending={registerSeat.isPending}
        partnerPending={registerWithPartner.isPending}
        error={joinError}
        suggestions={slotOf(suggestions)}
        searchResults={slotOf(search)}
        query={partnerQuery}
        onQueryChange={setPartnerQuery}
        onJoinSeat={(seat) => {
          setJoinError(null);
          registerSeat.mutate({
            gameId,
            sideIndex: seat.sideIndex,
            position: seat.position,
          });
        }}
        onRegisterWithPartner={({ partner, sideIndex, position }) => {
          setJoinError(null);
          registerWithPartner.mutate({
            gameId,
            partnerUserId: partner.id,
            sideIndex,
            position,
          });
        }}
      />
      <ConfirmSheet
        request={confirm}
        pending={leaveGame.isPending || leaveWaitlist.isPending}
        onClose={() => setConfirm(null)}
      />
    </View>
  );
}
