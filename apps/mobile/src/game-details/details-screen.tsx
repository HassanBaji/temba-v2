import type { FriendlyGameDetails } from "@repo/domain/friendly-game-details";
import { friendlyGameHomeTitle } from "@repo/domain/friendly-game-chrome";
import {
  isPartnerVacantSideRace,
  offersPartnerJoin,
  partnerVacantSideRaceRecovery,
} from "@repo/domain/friendly-game-partner";
import {
  COMPLETE_MATCH_ACTION,
  COMPLETE_MATCH_CONSEQUENCE,
  GAME_TOAST,
  LEAVE_GAME_ACTION,
  LEAVE_WAITLIST_ACTION,
  LEAVE_WAITLIST_CONSEQUENCE,
  gameJoinToast,
  teamRegisterToast,
} from "@repo/domain/game-copy";
import { SCORE_INCOMPLETE_MESSAGE } from "@repo/domain/friendly-game-score";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { LEVEL_RANGE_REQUEST_SENT_TOAST } from "@repo/domain/level-range-request";
import {
  isDrawnTournamentDetails,
  type TournamentDetails,
} from "@repo/domain/tournament-details";
import {
  tournamentLeaveOrKickConfirmCopy,
  tournamentPartnerVacantSideRaceMessage,
} from "@repo/domain/tournament-join";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";
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
import { COMPLETE_FAILED_FALLBACK } from "../tournament/tournament-model";
import { TournamentBar } from "../tournament/tournament-bar";
import { OrganizerSheets as TournamentOrganizerSheets } from "../tournament/organizer-sheets";
import { TournamentContent } from "../tournament/tournament-content";
import { useTournamentOrganizer } from "../tournament/use-tournament-organizer";
import { api } from "../trpc/react";
import { ConfirmSheet, type ConfirmRequest } from "./confirm-sheet";
import {
  GameDetailsBar,
  GameDetailsContent,
  type DetailsHandlers,
} from "./details-content";
import { OrganizerSheets } from "./organizer-sheets";
import { useOrganizerActions } from "./use-organizer-actions";
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
  const [initialSeat, setInitialSeat] = useState<{
    sideIndex: number;
    position: "left" | "right";
  } | null>(null);
  const [teamId, setTeamId] = useState("");

  const game = api.games.byId.useQuery({ id: gameId }, REFETCH_ON_FOREGROUND);
  const data = game.data;
  const friendly = data != null && isFriendlyGameDetails(data);
  const tournament = data != null && isDrawnTournamentDetails(data);
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
      const raceMessage = tournamentPartnerVacantSideRaceMessage(
        data != null && isPartnerRequiredGame(data),
      );
      setJoinError(raceMessage);
      const fresh = await utils.games.byId.fetch({ id: gameId });
      if (partnerVacantSideRaceRecovery(fresh.sides) === "game_home") {
        toast.show(raceMessage);
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

  const registerTeam = api.games.registerTeam.useMutation({
    onSuccess: (result) => toast.show(teamRegisterToast(result.waitlisted)),
    onError: failure,
    onSettled: refresh,
  });
  const addSet = api.games.addSet.useMutation({
    onError: failure,
    onSettled: refresh,
  });
  const completeMatch = api.games.completeMatch.useMutation();

  const firstMatchId = data?.matches[0]?.id;

  const organizer = useOrganizerActions({
    gameId,
    game: friendly ? data : null,
    partnerRequired: data != null && isPartnerRequiredGame(data),
    refresh,
    setConfirm,
  });

  const tournamentOrganizer = useTournamentOrganizer({
    gameId,
    game: tournament ? data : null,
    refresh,
    setConfirm,
  });

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

  function openJoin(seat?: { sideIndex: number; position: "left" | "right" }) {
    setInitialSeat(seat ?? null);
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

  async function saveTournamentSets(
    matchId: string,
    payloads: {
      setId: string;
      slot1GamesWon: number;
      slot2GamesWon: number;
    }[],
  ) {
    for (const payload of payloads) {
      await scoreSet.mutateAsync({ gameId, matchId, ...payload });
    }
  }

  async function saveScore(
    matchId: string,
    payloads: Parameters<typeof saveTournamentSets>[1],
  ) {
    if (payloads.length === 0) {
      toast.show(SCORE_INCOMPLETE_MESSAGE);
      return;
    }
    try {
      await saveTournamentSets(matchId, payloads);
      toast.show("Set saved");
    } catch (error) {
      toast.show(error instanceof Error ? error.message : "Could not save");
    } finally {
      await refresh();
    }
  }

  function askCompleteMatch(
    matchId: string,
    payloads: Parameters<typeof saveTournamentSets>[1],
  ) {
    async function run() {
      try {
        await saveTournamentSets(matchId, payloads);
        await completeMatch.mutateAsync({ gameId, matchId });
        toast.show("Match completed");
      } catch (error) {
        toast.show(
          error instanceof Error ? error.message : COMPLETE_FAILED_FALLBACK,
        );
      } finally {
        setConfirm(null);
        await refresh();
        await utils.ratings.me.invalidate();
      }
    }
    setConfirm({
      title: "Complete Match and update ratings?",
      description: COMPLETE_MATCH_CONSEQUENCE,
      confirmLabel: COMPLETE_MATCH_ACTION,
      onConfirm: () => void run(),
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

  const sheets = data ? (
    <>
      <JoinSheet
        visible={joinOpen}
        initialSeat={initialSeat}
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
          partnerRequired: isPartnerRequiredGame(data),
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
        pending={
          leaveGame.isPending ||
          leaveWaitlist.isPending ||
          completeMatch.isPending ||
          organizer.confirmPending ||
          tournamentOrganizer.confirmPending
        }
        onClose={() => setConfirm(null)}
      />
    </>
  ) : null;

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

  if (tournament) {
    const details: TournamentDetails = data;
    const firstTeamId = details.eligibleTeams[0]?.id ?? "";
    return (
      <View style={{ flex: 1 }}>
        <Screen refreshing={refreshing} onRefresh={onRefresh}>
          {header}
          <TournamentContent
            game={details}
            organizer={{
              card: tournamentOrganizer.handlers,
              onCancelMatch: tournamentOrganizer.openWalkover,
            }}
            handlers={{
              levelRequestPending: requestLevel.isPending,
              registerTeamPending: registerTeam.isPending,
              leavePending: leaveGame.isPending,
              teamId: teamId || firstTeamId,
              onTeamIdChange: setTeamId,
              onTakeSeat: (seat) => openJoin(seat),
              onRegisterTeam: (id) =>
                registerTeam.mutate({ gameId, teamId: id }),
              onRequestLevel: () => requestLevel.mutate({ gameId }),
              onLeave: askLeaveGame,
              scorePending: scoreSet.isPending,
              addSetPending: addSet.isPending,
              completePending: completeMatch.isPending,
              onSave: (matchId, payloads) => void saveScore(matchId, payloads),
              onAddSet: (matchId) => addSet.mutate({ gameId, matchId }),
              onComplete: askCompleteMatch,
            }}
          />
        </Screen>
        <TournamentBar
          game={details}
          handlers={{
            joinPending: registerSeat.isPending && !joinOpen,
            leaveWaitlistPending: leaveWaitlist.isPending,
            onJoin: () => openJoin(),
            onJoinWaitlist: () => registerSeat.mutate({ gameId }),
            onLeaveWaitlist: askLeaveWaitlist,
          }}
        />
        {sheets}
        <TournamentOrganizerSheets
          {...tournamentOrganizer.sheets}
          game={details}
        />
      </View>
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
    footerPendingKind: leaveGame.isPending
      ? "leave_game"
      : organizer.footerPendingKind,
    onMove: (sideIndex, position) =>
      moveSeat.mutate({ gameId, sideIndex, position }),
    onSaveSets: (payloads) => void saveSets(payloads),
    onConfirm: () =>
      firstMatchId && confirmResult.mutate({ gameId, matchId: firstMatchId }),
    onRequestLevel: () => requestLevel.mutate({ gameId }),
    onFooterAction: (kind) => {
      if (kind === "leave_game") {
        askLeaveGame();
        return;
      }
      organizer.onFooterAction(kind);
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <GameDetailsContent
          game={details}
          handlers={handlers}
          organizer={
            organizer.plan
              ? { plan: organizer.plan, handlers: organizer.handlers }
              : null
          }
        />
      </Screen>
      <GameDetailsBar
        game={details}
        handlers={{
          joinPending: registerSeat.isPending && !joinOpen,
          leaveWaitlistPending: leaveWaitlist.isPending,
          onJoin: () => openJoin(),
          onJoinWaitlist: () => registerSeat.mutate({ gameId }),
          onLeaveWaitlist: askLeaveWaitlist,
          onBrowse: () => router.push("/games"),
        }}
      />
      {sheets}
      {organizer.plan ? (
        <OrganizerSheets {...organizer.sheets} game={details} />
      ) : null}
    </View>
  );
}
