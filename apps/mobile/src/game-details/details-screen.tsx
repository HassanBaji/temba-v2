import { isFootballRosterGame } from "@repo/domain/football-game-details";
import { gameCustomName } from "@repo/domain/game-custom-name";
import {
  friendlyGameDetailsPlan,
  type FriendlyGameDetails,
} from "@repo/domain/friendly-game-details";
import {
  isPartnerVacantSideRace,
  offersPartnerJoin,
  partnerVacantSideRaceRecovery,
} from "@repo/domain/friendly-game-partner";
import {
  completeMatchAction,
  completeMatchConsequence,
  gameJoinToast,
  gameToast,
  leaveGameAction,
  leaveWaitlistAction,
  leaveWaitlistConsequence,
  teamRegisterToast,
} from "@repo/domain/game-copy";
import { scoreIncompleteMessage } from "@repo/domain/friendly-game-score";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  isDrawnTournamentDetails,
  type TournamentDetails,
} from "@repo/domain/tournament-details";
import {
  tournamentLeaveOrKickConfirmCopy,
  tournamentPartnerVacantSideRaceMessage,
} from "@repo/domain/tournament-join";
import { gameInviteAccess } from "@repo/domain/invites";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";
import { useRouter, useSegments } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { InviteEntry } from "../invites/invite-entry";
import { slotOf } from "../lib/slot-of";
import { PlayedFriendlyGame } from "../played-game/played-friendly-game";
import { gamePlayersLink } from "../player-profile/game-player-links";
import { playerPath } from "../player-profile/player-path";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { TournamentBar } from "../tournament/tournament-bar";
import { OrganizerSheets as TournamentOrganizerSheets } from "../tournament/organizer-sheets";
import { TournamentContent } from "../tournament/tournament-content";
import { useTournamentOrganizer } from "../tournament/use-tournament-organizer";
import { api } from "../trpc/react";
import { AddPlayerSheet } from "./add-player-sheet";
import { RenamePlayerSheet } from "./rename-player-sheet";
import { ConfirmSheet, type ConfirmRequest } from "./confirm-sheet";
import {
  GameDetailsBar,
  GameDetailsContent,
  gameHeroModel,
  type DetailsHandlers,
} from "./details-content";
import { FootballGameDetails } from "./football-details-screen";
import { GameHero } from "./game-hero";
import { OrganizerSheets } from "./organizer-sheets";
import { useOrganizerActions } from "./use-organizer-actions";
import {
  gameTitle,
  isFriendlyGameDetails,
  unsupportedFormatCopy,
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
  const m = useMessages();
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
          <Button
            label={m.common.tryAgain}
            variant="outline"
            onPress={onRetry}
          />
        </View>
      ) : null}
    </Surface>
  );
}

function LoadingSkeleton() {
  const m = useMessages();
  return (
    <View
      style={{ gap: 16 }}
      accessibilityLabel={m.mobileGameDetails.loadingGame}
    >
      <Skeleton height={220} radius={16} />
      <Skeleton height={200} radius={16} />
      <Skeleton height={200} radius={16} />
    </View>
  );
}

export function GameDetailsScreen({
  gameId,
  intent,
}: {
  gameId: string;
  intent?: string;
}) {
  const m = useMessages();
  const copy = m.mobileGameDetails;
  const locale = useLocale();
  const router = useRouter();
  const segments = useSegments();
  const toast = useToast();
  const utils = api.useUtils();
  const now = useNow();
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
  const [renaming, setRenaming] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const game = api.games.byId.useQuery({ id: gameId }, REFETCH_ON_FOREGROUND);
  const data = game.data;
  const football = data != null && isFootballRosterGame(data);
  const friendly = data != null && !football && isFriendlyGameDetails(data);
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
      toast.show(gameJoinToast(result.waitlisted, locale));
      setJoinOpen(false);
    },
    onError: (error) =>
      joinOpen ? setJoinError(error.message) : failure(error),
    onSettled: refresh,
  });
  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: (result) => {
      toast.show(gameJoinToast(result.waitlisted, locale));
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
        locale,
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
    onSuccess: () => toast.show(gameToast(locale).seatChanged),
    onError: failure,
    onSettled: refresh,
  });
  const leaveGame = api.games.leave.useMutation({
    onSuccess: () => toast.show(gameToast(locale).left),
    onError: failure,
    onSettled: () => {
      setConfirm(null);
      return refresh();
    },
  });
  const leaveWaitlist = api.games.leaveWaitlist.useMutation({
    onSuccess: () => toast.show(gameToast(locale).leftWaitlist),
    onError: failure,
    onSettled: () => {
      setConfirm(null);
      return refresh();
    },
  });
  const scoreSet = api.games.scoreSet.useMutation();
  const confirmResult = api.games.confirmMatchResult.useMutation({
    onSuccess: () => toast.show(copy.toast.resultConfirmed),
    onError: failure,
    onSettled: async () => {
      await refresh();
      await utils.ratings.me.invalidate();
    },
  });
  const requestLevel = api.games.requestLevelRange.useMutation({
    onSuccess: () => toast.show(m.level.request.sent),
    onError: failure,
    onSettled: refresh,
  });

  const registerTeam = api.games.registerTeam.useMutation({
    onSuccess: (result) =>
      toast.show(teamRegisterToast(result.waitlisted, locale)),
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
        toast.show(scoreIncompleteMessage(locale));
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
        toast.show(copy.toast.setSaved);
      } catch (error) {
        toast.show(
          error instanceof Error ? error.message : copy.toast.couldNotSave,
        );
      } finally {
        await refresh();
      }
    },
    [
      copy.toast.couldNotSave,
      copy.toast.setSaved,
      firstMatchId,
      gameId,
      locale,
      refresh,
      scoreSet,
      toast,
    ],
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
      title: copy.confirm.leaveTitle(gameTitle(data.name, locale)),
      description: tournamentLeaveOrKickConfirmCopy({
        partnerRequired: isPartnerRequiredGame(data),
        drawPosted: Boolean(data.drawPostedAt),
        locale,
      }),
      confirmLabel: leaveGameAction(locale),
      onConfirm: () => leaveGame.mutate({ gameId }),
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
      toast.show(scoreIncompleteMessage(locale));
      return;
    }
    try {
      await saveTournamentSets(matchId, payloads);
      toast.show(copy.toast.setSaved);
    } catch (error) {
      toast.show(
        error instanceof Error ? error.message : copy.toast.couldNotSave,
      );
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
        toast.show(copy.toast.matchCompleted);
      } catch (error) {
        toast.show(
          error instanceof Error ? error.message : copy.toast.completeFailed,
        );
      } finally {
        setConfirm(null);
        await refresh();
        await utils.ratings.me.invalidate();
      }
    }
    setConfirm({
      title: copy.confirm.completeMatchTitle,
      description: completeMatchConsequence(locale),
      confirmLabel: completeMatchAction(locale),
      onConfirm: () => void run(),
    });
  }

  const header = <ScreenHeader nav="back" fallback="/games" />;

  const inviteAccess = data
    ? gameInviteAccess({
        friendlyChrome: friendly,
        isOrganizer: data.isOrganizer,
        registrationStatus: data.registrationStatus,
        cancelledAt: data.cancelledAt,
        joinFrozen: data.joinFrozen,
        registrationMode: data.registrationMode,
        partnerRequired: isPartnerRequiredGame(data),
      })
    : null;
  const inviteEntry = inviteAccess?.canManage ? (
    <InviteEntry onPress={() => setInviteOpen(true)} />
  ) : null;

  const sheets = data ? (
    <>
      {inviteAccess?.canManage ? (
        <InviteDoorSheet
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
          door={{
            kind: "game",
            gameId,
            canLookup: inviteAccess.canSendLookup,
            canLink: true,
            share: {
              customName: gameCustomName(data),
              format: data.format,
              registrationMode: data.registrationMode,
              venueName: data.venue?.name ?? null,
              courtName: data.matches[0]?.courtName ?? null,
              windowStart: data.windowStart,
              windowEnd: data.windowEnd,
              sides: data.sides,
            },
          }}
        />
      ) : null}
      <JoinSheet
        visible={joinOpen}
        initialSeat={initialSeat}
        onClose={() => setJoinOpen(false)}
        game={{
          title: gameTitle(data.name, locale),
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
          title={copy.notFound.title}
          description={copy.notFound.description}
        />
      </Screen>
    );
  }

  if (game.error && !data) {
    return (
      <Screen>
        {header}
        <Notice
          title={copy.loadFailed}
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

  const onOpenPlayer = gamePlayersLink(data)
    ? (userId: string) => router.push(playerPath(segments, userId))
    : undefined;

  if (football) {
    return (
      <FootballGameDetails
        gameId={gameId}
        game={data}
        openJoin={intent === "join"}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    );
  }

  if (tournament) {
    const details: TournamentDetails = data;
    const firstTeamId = details.eligibleTeams[0]?.id ?? "";
    return (
      <View style={{ flex: 1 }}>
        <Screen refreshing={refreshing} onRefresh={onRefresh}>
          {header}
          {inviteEntry}
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
              onOpenPlayer,
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
        {details.isOrganizer ? (
          <AddPlayerSheet
            visible={tournamentOrganizer.addPlayer.open}
            onClose={tournamentOrganizer.addPlayer.onClose}
            gameId={gameId}
            placement="side"
            sides={details.sides}
            onAdded={refresh}
          />
        ) : null}
      </View>
    );
  }

  if (!friendly) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          title={unsupportedFormatCopy(locale).title}
          description={unsupportedFormatCopy(locale).description}
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
    onOpenPlayer,
    onRenameUnclaimed: details.isOrganizer ? setRenaming : undefined,
  };

  const hero = gameHeroModel(details, now, locale);
  const playedMatch =
    details.phase === "final"
      ? friendlyGameDetailsPlan(details).firstMatch
      : undefined;

  return (
    <View style={{ flex: 1 }}>
      {playedMatch ? (
        <PlayedFriendlyGame
          gameId={gameId}
          game={details}
          match={playedMatch}
          refreshing={refreshing}
          onRefresh={onRefresh}
          organizer={organizer}
          onOpenPlayer={onOpenPlayer}
          onRenameUnclaimed={details.isOrganizer ? setRenaming : undefined}
        />
      ) : (
        <>
          <Screen
            refreshing={refreshing}
            onRefresh={onRefresh}
            statusBarTone={hero?.tone ?? "paper"}
            header={
              hero ? (
                <GameHero
                  model={hero}
                  fallback="/games"
                  actions={inviteEntry}
                />
              ) : undefined
            }
          >
            {hero ? null : (
              <>
                {header}
                {inviteEntry}
              </>
            )}
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
        </>
      )}
      {sheets}
      {organizer.plan ? (
        <>
          <OrganizerSheets {...organizer.sheets} />
          <AddPlayerSheet
            visible={organizer.addPlayer.open}
            onClose={organizer.addPlayer.onClose}
            gameId={gameId}
            placement="seat"
            sides={details.sides}
            onAdded={refresh}
          />
        </>
      ) : null}
      {details.isOrganizer ? (
        <RenamePlayerSheet
          player={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}
    </View>
  );
}
