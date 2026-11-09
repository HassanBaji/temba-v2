import { isFootballRosterGame } from "@repo/domain/football-game-details";
import { gameCustomName } from "@repo/domain/game-custom-name";
import { friendlyGameFooterActions } from "@repo/domain/friendly-game-actions";
import { courtFigures } from "@repo/domain/friendly-game-court";
import {
  friendlyGameShareLink,
  type FriendlyGameJoinSeat,
} from "@repo/domain/friendly-game-cta";
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
  gameJoinToast,
  gameToast,
  leaveGameAction,
  leaveGameOrganizerConsequence,
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
import { occupiedFriendlyPositions } from "@repo/domain/game-invite-open-graph";
import { gameInviteAccess } from "@repo/domain/invites";
import type { PlayedRow } from "@repo/domain/played-game";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";
import { useRouter, useSegments } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, Platform, View } from "react-native";

import { directionsUrl } from "../booking/booking-model";
import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { InviteEntry } from "../invites/invite-entry";
import { slotOf } from "../lib/slot-of";
import { PlayedFriendlyGame } from "../played-game/played-friendly-game";
import { PlayedMenuSheet } from "../played-game/played-menu-sheet";
import { PlayedPlayerSheet } from "../played-game/played-player-sheet";
import { gamePlayersLink } from "../player-profile/game-player-links";
import { playerPath } from "../player-profile/player-path";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
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
import { ChallengeDetailsCard } from "./challenge-details-card";
import { gameMenuItems } from "./game-menu";
import { OrganizerSheets } from "./organizer-sheets";
import { useOrganizerActions } from "./use-organizer-actions";
import { useShareGame } from "./use-share-game";
import {
  gameTitle,
  isFriendlyGameDetails,
  unsupportedFormatCopy,
} from "./details-model";
import { JoinSheet } from "./join-sheet";
import { useErrorMessage } from "../lib/use-error-message";

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
  const errorText = useErrorMessage();
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayedRow | null>(null);
  const [addSeat, setAddSeat] = useState<FriendlyGameJoinSeat | null>(null);
  const shareGame = useShareGame(gameId);

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
  const enterTournamentScore = api.games.enterTournamentScore.useMutation({
    onSuccess: () => toast.show(copy.toast.setSaved),
    onError: failure,
    onSettled: async () => {
      await refresh();
      await utils.ratings.me.invalidate();
    },
  });

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
          error instanceof Error ? errorText(error) : copy.toast.couldNotSave,
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
      title: copy.confirm.leaveTitle(gameTitle(data, locale)),
      description:
        friendly && data.isOrganizer
          ? leaveGameOrganizerConsequence(locale)
          : tournamentLeaveOrKickConfirmCopy({
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

  const inviteAccess = data
    ? gameInviteAccess({
        friendlyChrome: friendly,
        isOrganizer: data.isOrganizer,
        registrationStatus: data.registrationStatus,
        cancelledAt: data.cancelledAt,
        registrationMode: data.registrationMode,
        partnerRequired: isPartnerRequiredGame(data),
      })
    : null;
  const shareContext = data
    ? {
        customName: gameCustomName(data),
        format: data.format,
        registrationMode: data.registrationMode,
        venueName: data.venue?.name ?? null,
        courtName: data.matches[0]?.courtName ?? null,
        windowStart: data.windowStart,
        windowEnd: data.windowEnd,
        sides: data.sides,
        levelMinTenths: data.levelMinTenths,
        levelMaxTenths: data.levelMaxTenths,
        waitlist: data.waitlist,
      }
    : null;
  const shareLink = data
    ? friendlyGameShareLink({
        canMintInvite: inviteAccess?.canManage ?? false,
        cancelled: data.cancelledAt != null,
        phase: data.phase ?? null,
      })
    : null;
  const inviteEntry = inviteAccess?.canManage ? (
    <InviteEntry onPress={() => setInviteOpen(true)} />
  ) : null;

  const sheets =
    data && shareContext ? (
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
              share: shareContext,
            }}
          />
        ) : null}
        <JoinSheet
          visible={joinOpen}
          initialSeat={initialSeat}
          onClose={() => setJoinOpen(false)}
          game={{
            title: gameTitle(data, locale),
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
              scorePending: enterTournamentScore.isPending,
              onSave: (matchId, score) =>
                enterTournamentScore.mutate({ gameId, matchId, ...score }),
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
            groupName={details.groupName}
            onAdded={refresh}
          />
        ) : null}
      </View>
    );
  }

  if (!friendly) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <Notice
          title={unsupportedFormatCopy(locale).title}
          description={unsupportedFormatCopy(locale).description}
        />
      </Screen>
    );
  }

  const details: FriendlyGameDetails = data;
  const canAddAtSeat = organizer.plan?.canAddPlayer ?? false;
  const canTapPlayers = Boolean(onOpenPlayer) || organizer.plan != null;
  const handlers: DetailsHandlers = {
    movePending: moveSeat.isPending,
    scorePending: scoreSet.isPending,
    confirmPending: confirmResult.isPending,
    levelRequestPending: requestLevel.isPending,
    onMove: (sideIndex, position) =>
      moveSeat.mutate({ gameId, sideIndex, position }),
    onJoinSeat: (seat) => openJoin(seat),
    onAddPlayerAt: canAddAtSeat
      ? (seat) => {
          setAddSeat(seat);
          organizer.handlers.onAddPlayer();
        }
      : undefined,
    onInvite: inviteAccess?.canManage ? () => setInviteOpen(true) : undefined,
    onPressPlayer: canTapPlayers ? setSelectedPlayer : undefined,
    onSaveSets: (payloads) => void saveSets(payloads),
    onConfirm: () =>
      firstMatchId && confirmResult.mutate({ gameId, matchId: firstMatchId }),
    onRequestLevel: () => requestLevel.mutate({ gameId }),
  };

  const hero = gameHeroModel(details, now, locale);
  const plan = friendlyGameDetailsPlan(details);
  const playedMatch = details.phase === "final" ? plan.firstMatch : undefined;
  const menuItems = gameMenuItems({
    plan: organizer.plan,
    handlers: organizer.plan ? organizer.handlers : null,
    footerActions:
      details.phase && details.phase !== "cancelled"
        ? friendlyGameFooterActions({
            phase: details.phase,
            isOrganizer: details.isOrganizer,
            canLeaveGame: plan.canLeaveGame,
            canReportWrongScore: details.canReportWrongScore,
            playerCount: occupiedFriendlyPositions(details.sides),
            locale,
          })
        : [],
    onFooterAction: (kind) => {
      if (kind === "leave_game") {
        askLeaveGame();
        return;
      }
      organizer.onFooterAction(kind);
    },
    messages: m,
    locale,
  });
  const venue = data.venue;
  const placeLine = [plan.firstMatch?.courtName, venue?.city]
    .filter(Boolean)
    .join(" · ");
  const heroPlace = {
    name: venue?.name ?? null,
    line: placeLine || null,
    onDirections: venue
      ? () =>
          void Linking.openURL(
            directionsUrl(
              { ...venue, city: venue.city ?? "" },
              Platform.OS,
              locale,
            ),
          )
      : null,
  };
  const heroFigures = courtFigures({
    seatedCount: occupiedFriendlyPositions(details.sides),
    seatCount: details.sides.length * 2,
    durationInMinutes: plan.firstMatch?.durationInMinutes ?? null,
    pricePerPlayerFils: details.pricePerPlayerFils,
    locale,
  });

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
                  place={heroPlace}
                  figures={heroFigures}
                  tag={data.challenge ? m.challenge.gameDetails.tag : undefined}
                  onShare={
                    shareLink && shareContext
                      ? () => void shareGame(shareContext, shareLink)
                      : undefined
                  }
                  onMore={
                    menuItems.length > 0 ? () => setMenuOpen(true) : undefined
                  }
                />
              ) : undefined
            }
          >
            {data.challenge ? (
              <ChallengeDetailsCard
                challenge={data.challenge}
                sport={data.sport}
              />
            ) : null}
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
            onClose={() => {
              setAddSeat(null);
              organizer.addPlayer.onClose();
            }}
            gameId={gameId}
            placement="seat"
            sides={details.sides}
            initialSeat={addSeat}
            groupName={details.groupName}
            onAdded={refresh}
          />
        </>
      ) : null}
      {playedMatch ? null : (
        <>
          <PlayedMenuSheet
            visible={menuOpen}
            title={gameTitle(details, locale)}
            items={menuItems}
            onClose={() => setMenuOpen(false)}
          />
          <PlayedPlayerSheet
            player={selectedPlayer}
            canOpenProfile={Boolean(onOpenPlayer)}
            canKick={
              selectedPlayer != null &&
              (organizer.plan?.kickableUserIds ?? []).includes(
                selectedPlayer.userId,
              )
            }
            canRename={
              details.isOrganizer && Boolean(selectedPlayer?.unclaimed)
            }
            onClose={() => setSelectedPlayer(null)}
            onOpenProfile={(userId) => {
              setSelectedPlayer(null);
              onOpenPlayer?.(userId);
            }}
            onKick={(userId) => {
              setSelectedPlayer(null);
              organizer.handlers.onKickPlayer(userId);
            }}
            onRename={(player) => {
              setSelectedPlayer(null);
              setRenaming(player);
            }}
          />
        </>
      )}
      {details.isOrganizer ? (
        <RenamePlayerSheet
          player={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}
    </View>
  );
}
