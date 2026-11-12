"use client";

import {
  Ban,
  LockIcon,
  LockOpenIcon,
  LogOutIcon,
  PencilIcon,
  Share,
  UserPlusIcon,
  UserRoundPlusIcon,
} from "lucide-react";
import { notFound, usePathname, useRouter } from "next/navigation";
import { use } from "react";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { RenameUnclaimedPlayerDialog } from "~/components/common/rename-unclaimed-player-dialog";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { AddPlayerDialog } from "~/components/games/add-player-dialog";
import { EditTeamsDialog } from "~/components/games/edit-teams-dialog";
import { OpenSpotDialog } from "~/components/games/open-spot-dialog";
import { FootballGameDetails } from "~/components/games/football-game-details";
import { GameActionsSheet } from "~/components/games/game-actions-sheet";
import { GameDetailsSkeleton } from "~/components/games/game-details-skeleton";
import { FriendlyGameCtaBar } from "~/components/games/friendly-game-cta-bar";
import { FriendlyGameDetailsHero } from "~/components/games/friendly-game-details-hero";
import { ChallengeDetailsBlock } from "~/components/games/challenge-details-block";
import { ChallengeTag } from "~/components/games/challenge-tag";
import { FriendlyGameJoinSheet } from "~/components/games/friendly-game-join-sheet";
import { FriendlyGameMenu } from "~/components/games/friendly-game-menu";
import { HeroNavRow } from "~/components/games/hero-nav-row";
import { PlayedFriendlyGame } from "~/components/games/played/played-friendly-game";
import { PlayedPlayerDialog } from "~/components/games/played/played-player-dialog";
import { GameEditDialog } from "~/components/games/game-edit-dialog";
import { GameHomeHeader } from "~/components/games/game-home-header";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import { GameBookedBlock } from "~/components/games/game-booked-block";
import {
  GameLineupSection,
  type OpenSeatAction,
} from "~/components/games/game-lineup-section";
import { GameOverviewPanel } from "~/components/games/game-overview-panel";
import { GamePlayersPanel } from "~/components/games/game-players-panel";
import {
  GameRatingImpactBlock,
  GameRatingScopeBlock,
} from "~/components/games/game-rating-impact-block";
import { GameResultsPanel } from "~/components/games/game-results-panel";
import { GameScoreSection } from "~/components/games/game-score-section";
import { TournamentHome } from "~/components/games/tournament-home";
import { TournamentKnockoutCancelDialog } from "~/components/games/tournament-knockout-cancel-dialog";
import { TournamentPoolTablesPanel } from "~/components/games/tournament-pool-tables-panel";
import {
  gameInviteSubtitle,
  InviteDoorDialog,
} from "~/components/invites/invite-door-dialog";
import type { LookupUserSearchRow } from "@repo/api/types";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { useGameEdit } from "~/components/games/use-game-edit";
import { gameEditSectionsFor } from "@repo/domain/game-edit-form";
import {
  cancelGameConsequence,
  gameJoinToast,
  gameToast,
  leaveGameOrganizerConsequence,
  teamRegisterToast,
  kickedToast,
} from "@repo/domain/game-copy";
import { occupiedFriendlyPositions } from "@repo/domain/game-invite-open-graph";
import { gameInviteClipboardText } from "@repo/domain/game-invite-share-message";
import { gameInviteAccess } from "@repo/domain/invites";
import {
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRequest,
  type GameKickTarget,
} from "@repo/domain/game-kick-confirm";
import {
  friendlyGameCanMintInvite,
  friendlyGameShareLink,
  friendlyGameVacantSeatLine,
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "@repo/domain/friendly-game-cta";
import {
  lineupSidesNote,
  viewerSideOpenLine,
  viewerTeam,
  viewerTeamName,
} from "@repo/domain/padel-sides";
import { PickSideDialog } from "~/components/games/pick-side-dialog";
import {
  friendlyGameCtaCopy,
  friendlyGameFooterActions,
} from "@repo/domain/friendly-game-actions";
import {
  courtFigures,
  courtPositionLabel,
  courtSpotsLabel,
  scoreLeadLine,
} from "@repo/domain/friendly-game-court";
import {
  friendlyGameCanKickPlayer,
  friendlyGameVacantSeatAction,
  friendlyGameVacantSeatLabel,
} from "@repo/domain/friendly-game-players";
import { friendlyGameVenueDirectionsUrl } from "@repo/domain/friendly-game-chrome";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import type { PlayedRow } from "@repo/domain/played-game";
import {
  addPlayerPlacement,
  organizerCanAddPlayer,
} from "@repo/domain/add-player-by-phone";
import { isFootballRosterGame } from "@repo/domain/football-game-details";
import {
  friendlyGameDetailsPlan,
  seatedPlayerCanRename,
} from "@repo/domain/friendly-game-details";
import { friendlyGameHeroInput } from "@repo/domain/friendly-game-hero";
import { friendlyGameHomeTitle } from "@repo/domain/friendly-game-chrome";
import {
  gameHomeIntentFromQuery,
  gameHomeTabFromQuery,
  gameHomeTabQuery,
} from "~/lib/game-home-tab";
import { gameViewerStatus } from "@repo/domain/game-summary-cta";
import { canEditTeams, editTeamsSpotLabel } from "@repo/domain/edit-teams";
import { gameDetailsChrome } from "@repo/domain/tournament-home";
import { type KnockoutMatchPlace } from "@repo/domain/tournament-knockout-view";
import {
  tournamentInviteLandingOpensPartnerSheet,
  tournamentLeaveOrKickConfirmCopy,
} from "@repo/domain/tournament-join";
import { tournamentRoundsPlan } from "@repo/domain/tournament-organizer";
import {
  isPartnerRequiredGame,
  isKnockoutOnly,
  showsDrawnTournamentSeats,
} from "@repo/domain/tournament-rounds";
import { gameCustomName, gameDisplayName } from "@repo/domain/game-custom-name";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { gamePlayersLink } from "~/lib/game-player-links";
import { shareLinkWithFeedback } from "~/lib/share-link";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const EMPTY_EDIT_SOURCE = {
  name: null,
  hasCustomName: false,
  windowStart: null,
  windowEnd: null,
  pricePerPlayerFils: null,
  playersAllowed: null,
  sideSize: null,
  levelMinTenths: null,
  levelMaxTenths: null,
  roundCount: null,
  seasonId: null,
};

export default function GameHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string | string[];
    join?: string | string[];
    intent?: string | string[];
  }>;
}) {
  const { id } = use(params);
  const query = use(searchParams);
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab = gameHomeTabFromQuery(tabParam);
  const joinParam = Array.isArray(query.join) ? query.join[0] : query.join;
  const intent = gameHomeIntentFromQuery(
    Array.isArray(query.intent) ? query.intent[0] : query.intent,
  );
  const m = useMessages();
  const locale = useLocale();
  const g = m.webDashboard.game;
  const toastCopy = gameToast(locale);
  const router = useRouter();
  const pathname = usePathname() ?? `/dashboard/games/${id}`;
  const utils = api.useUtils();

  function setTab(next: string) {
    const resolved = gameHomeTabFromQuery(next);
    if (resolved === tab) {
      return;
    }
    router.replace(`${pathname}${gameHomeTabQuery(resolved)}`, {
      scroll: false,
    });
  }
  const game = api.games.byId.useQuery({ id });
  const resultsSectionRef = React.useRef<HTMLDivElement>(null);
  const focusResultsSection = React.useCallback(() => {
    const section = resultsSectionRef.current;
    section?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    section
      ?.querySelector<HTMLInputElement>("input")
      ?.focus({ preventScroll: true });
  }, []);

  const [partnerQuery, setPartnerQuery] = React.useState("");
  const [selectedPartner, setSelectedPartner] = React.useState<
    LookupUserSearchRow[]
  >([]);
  const [partnerSide, setPartnerSide] = React.useState("");
  const [partnerPosition, setPartnerPosition] = React.useState<
    "left" | "right"
  >("left");
  const [teamId, setTeamId] = React.useState("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [invitesOpen, setInvitesOpen] = React.useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState<{
    userId: string;
    name: string;
    guest?: boolean;
  } | null>(null);
  const [cancelGameOpen, setCancelGameOpen] = React.useState(false);
  const [leaveGameOpen, setLeaveGameOpen] = React.useState(false);
  const [leaveWaitlistOpen, setLeaveWaitlistOpen] = React.useState(false);
  const [cancelMatchId, setCancelMatchId] = React.useState<string | null>(null);
  const [cancelKnockoutPlace, setCancelKnockoutPlace] =
    React.useState<KnockoutMatchPlace | null>(null);
  const [joinPickerOpen, setJoinPickerOpen] = React.useState(false);
  const [pickSideOpen, setPickSideOpen] = React.useState(false);
  const [joinPickerSeat, setJoinPickerSeat] =
    React.useState<FriendlyGameJoinSeat | null>(null);
  const [kickConfirm, setKickConfirm] = React.useState<GameKickTarget | null>(
    null,
  );
  const [completeMatchId, setCompleteMatchId] = React.useState<string | null>(
    null,
  );
  const [markAsNotPlayedOpen, setMarkAsNotPlayedOpen] = React.useState(false);
  const [editTeamsOpen, setEditTeamsOpen] = React.useState(false);
  const [addSide, setAddSide] = React.useState<number | null>(null);
  const [openSpot, setOpenSpot] = React.useState<{
    seat: FriendlyGameJoinSeat;
    own: "move" | "join";
  } | null>(null);
  const [addSeat, setAddSeat] = React.useState<FriendlyGameJoinSeat | null>(
    null,
  );
  const [selectedPlayer, setSelectedPlayer] = React.useState<PlayedRow | null>(
    null,
  );
  const [reportWrongScoreOpen, setReportWrongScoreOpen] = React.useState(false);

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: async (result) => {
      toast.success(gameJoinToast(result.waitlisted, locale));
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      if (!joinPickerOpen) {
        toastGlobalFormError(error);
      }
    },
  });

  const moveSeat = api.games.moveSeat.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.seatChanged);
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const setSeatSide = api.games.setSeatSide.useMutation({
    onSuccess: async () => {
      toast.success(m.game.sides.sideSavedToast);
      setPickSideOpen(false);
      await utils.games.byId.invalidate({ id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const setTeamSides = api.games.setTeamSides.useMutation({
    onSuccess: async () => {
      toast.success(m.game.sides.setSidesToast);
      await utils.games.byId.invalidate({ id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: async (result) => {
      toast.success(gameJoinToast(result.waitlisted, locale));
      setPartnerQuery("");
      setSelectedPartner([]);
      setPartnerSide("");
      setPartnerPosition("left");
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.games.searchPartnerUsers.invalidate({ gameId: id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const registerTeam = api.games.registerTeam.useMutation({
    onSuccess: async (result) => {
      toast.success(teamRegisterToast(result.waitlisted, locale));
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const mergeHalfTeams = api.games.mergeHalfTeams.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.halfTeamsMerged);
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const knockoutOnlyDraw = () =>
    game.data != null &&
    isKnockoutOnly(game.data.format, game.data.tournamentShape);

  const drawPools = api.games.drawPools.useMutation({
    onSuccess: async () => {
      toast.success(
        knockoutOnlyDraw() ? toastCopy.knockoutDrawn : toastCopy.poolsDrawn,
      );
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const postPoolDraw = api.games.postPoolDraw.useMutation({
    onSuccess: async () => {
      toast.success(
        knockoutOnlyDraw()
          ? toastCopy.knockoutDrawPosted
          : toastCopy.poolDrawPosted,
      );
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const undoPoolDraw = api.games.undoPoolDraw.useMutation({
    onSuccess: async () => {
      toast.success(
        knockoutOnlyDraw()
          ? toastCopy.knockoutDrawUndone
          : toastCopy.poolDrawUndone,
      );
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const leaveGame = api.games.leave.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.left);
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const leaveWaitlist = api.games.leaveWaitlist.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.leftWaitlist);
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  async function refreshGame() {
    await utils.games.byId.invalidate({ id });
    await utils.users.home.invalidate();
    await utils.games.listPublicPickup.invalidate();
    await utils.games.listMyGames.invalidate();
    await utils.games.listMyMatchHistory.invalidate();
  }

  const kick = api.games.kick.useMutation({
    onSuccess: async () => {
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const closeRegistration = api.games.closeRegistration.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.registrationClosed);
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const reopenRegistration = api.games.reopenRegistration.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.registrationReopened);
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const cancelGame = api.games.cancel.useMutation({
    onSuccess: async () => {
      toast.success(toastCopy.gameCancelled);
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const cancelMatch = api.games.cancelMatch.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.cancelledGame
          ? toastCopy.gameCancelled
          : toastCopy.matchCancelled,
      );
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const updateMatch = api.games.updateMatch.useMutation({
    onSuccess: async () => {
      toast.success(g.toast.matchUpdated);
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const scoreSet = api.games.scoreSet.useMutation({
    onSuccess: async () => {
      toast.success(g.toast.setSaved);
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const completeMatch = api.games.completeMatch.useMutation({
    onSuccess: async () => {
      toast.success(g.toast.matchCompleted);
      await refreshGame();
      await utils.ratings.me.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const confirmMatchResult = api.games.confirmMatchResult.useMutation({
    onSuccess: async () => {
      toast.success(g.toast.resultConfirmed);
      await refreshGame();
      await utils.ratings.me.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const reportWrongScore = api.games.reportWrongScore.useMutation({
    onSuccess: async () => {
      toast.success(g.toast.scoreReopened);
      await refreshGame();
      await utils.ratings.me.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  function inviteShareText(url: string) {
    const row = game.data;
    return gameInviteClipboardText({
      format: row?.format ?? "",
      registrationMode: row?.registrationMode ?? "",
      shortUrl: url,
      roster: row
        ? {
            customName: gameCustomName(row),
            venueName: row.venue?.name ?? m.webDashboard.venue.title,
            courtName: row.matches[0]?.courtName ?? null,
            windowStart: row.windowStart,
            windowEnd: row.windowEnd,
            sides: row.sides,
            shortUrl: url,
            levelMinTenths: row.levelMinTenths,
            levelMaxTenths: row.levelMaxTenths,
            waitlist: row.waitlist,
            locale,
          }
        : null,
    });
  }

  const createInviteLink = api.games.createInviteLink.useMutation({
    onSuccess: async () => {
      await utils.games.getInviteLink.invalidate({ gameId: id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  function shareInviteLink() {
    const text = createInviteLink
      .mutateAsync({ gameId: id })
      .then((result) => ({
        text: inviteShareText(result.shortUrl ?? result.inviteUrl),
      }))
      .catch(() => null);
    void shareLinkWithFeedback(text, g.toast.inviteLinkCopied, locale);
  }

  function shareGamePage() {
    const text = utils.games.resultLink
      .fetch({ gameId: id })
      .then((result) => ({ text: inviteShareText(result.url) }))
      .catch(() => null);
    void shareLinkWithFeedback(text, g.toast.linkCopied, locale);
  }

  const data = game.data;
  const editSections = gameEditSectionsFor({
    format: data?.format ?? "friendly_game",
    sport: data?.sport,
    groupId: data?.groupId ?? null,
    tournamentRounds: data?.format === "friendly_tournament",
    booked: data?.booking != null,
    challenge: data?.challenge != null,
  });
  const edit = useGameEdit({
    gameId: id,
    game: data ?? EMPTY_EDIT_SOURCE,
    sections: editSections,
    seasons: data?.groupSeasons ?? [],
    open: editOpen,
    mvpEnabled:
      data?.isOrganizer === true &&
      data.format === "friendly_game" &&
      data.cancelledAt == null,
    onSaved: refreshGame,
    onClose: () => setEditOpen(false),
  });
  const firstEligibleTeam = data?.eligibleTeams[0]?.id ?? "";
  const courts = api.games.listCourts.useQuery(
    { gameId: id },
    {
      enabled: Boolean(
        data?.isOrganizer &&
          (data.format === "friendly_tournament" ||
            data.format === "friendly_game"),
      ),
    },
  );
  const chrome = data
    ? gameDetailsChrome(
        data.format,
        data.poolCount,
        data.tournamentShape,
        data.registrationMode,
      )
    : "tabs";
  const usesFriendlyChrome = chrome === "friendly_game";
  const usesDrawnTournamentChrome = chrome === "drawn_tournament";
  const usesDrawnTournamentSeats = Boolean(
    data &&
      showsDrawnTournamentSeats(
        data.format,
        data.poolCount,
        data.tournamentShape,
        data.registrationMode,
      ),
  );
  const inviteAccess = data
    ? gameInviteAccess({
        friendlyChrome: usesFriendlyChrome,
        isOrganizer: data.isOrganizer,
        registrationStatus: data.registrationStatus,
        cancelledAt: data.cancelledAt,
        registrationMode: data.registrationMode,
        partnerRequired: isPartnerRequiredGame(data),
      })
    : { canManage: false, canSendLookup: false };
  const canMintInvite = data ? friendlyGameCanMintInvite(data) : false;
  const canManageGameInvites = inviteAccess.canManage;
  const canSendGameLookup = inviteAccess.canSendLookup;
  const canPartnerPick = Boolean(
    data &&
      (data.canRegister || data.canWaitlist) &&
      data.registrationMode === "individual" &&
      data.format !== "americano",
  );
  const partnerSearch = api.games.searchPartnerUsers.useQuery(
    { gameId: id, query: partnerQuery },
    { enabled: canPartnerPick },
  );

  React.useEffect(() => {
    if (firstEligibleTeam && teamId.length === 0) {
      setTeamId(firstEligibleTeam);
    }
  }, [firstEligibleTeam, teamId.length]);

  React.useEffect(() => {
    if (!tournamentInviteLandingOpensPartnerSheet(joinParam) || !data) {
      return;
    }
    if (data.canRegister) {
      setJoinPickerSeat(null);
      setJoinPickerOpen(true);
    }
    router.replace(`${pathname}${gameHomeTabQuery(tab)}`, { scroll: false });
  }, [data, joinParam, pathname, router, tab]);

  React.useEffect(() => {
    if (!intent || !data) {
      return;
    }
    if (intent === "invite" && canManageGameInvites) {
      setInvitesOpen(true);
    }
    if (intent === "results" && !usesFriendlyChrome) {
      router.replace(`${pathname}${gameHomeTabQuery("results")}`, {
        scroll: false,
      });
      return;
    }
    if (intent === "results") {
      focusResultsSection();
    }
    router.replace(`${pathname}${gameHomeTabQuery(tab)}`, { scroll: false });
  }, [
    canManageGameInvites,
    data,
    focusResultsSection,
    intent,
    pathname,
    router,
    tab,
    usesFriendlyChrome,
  ]);

  if (isNotFoundError(game.error)) {
    notFound();
  }

  if (game.isLoading) {
    return (
      <DashboardShell
        title={g.title}
        hidePageHeader
        hideMobileTopBar
        isSubPage
        hideNav
      >
        <GameDetailsSkeleton />
      </DashboardShell>
    );
  }

  if (game.error) {
    return (
      <DashboardShell title={g.title}>
        <ErrorState
          title={g.errorTitle}
          error={game.error}
          onRetry={() => {
            void game.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell title={g.title}>
        <ErrorState
          title={g.errorTitle}
          onRetry={() => {
            void game.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (isFootballRosterGame(data)) {
    return (
      <FootballGameDetails
        gameId={id}
        game={data}
        openInvites={intent === "invite"}
        openJoin={intent === "join"}
      />
    );
  }

  const gameName = gameDisplayName(data, locale);
  const shellTitle = usesFriendlyChrome
    ? friendlyGameHomeTitle(data.groupId, data.groupName, locale)
    : g.title;
  const isOrganizerActive = data.isOrganizer && !data.cancelledAt;
  const roundsPlan = tournamentRoundsPlan(data, edit.draft.roundCount);
  const showMenu = isOrganizerActive;
  const primaryLeave = data.isRegistered && data.canLeave && !data.isWaitlisted;
  const primaryLeaveWaitlist = data.isWaitlisted;
  const plan = friendlyGameDetailsPlan(data);
  const addPlacement = addPlayerPlacement(data);
  const canAddPlayer = organizerCanAddPlayer(data);
  const openAddPlayer = canAddPlayer ? () => setAddPlayerOpen(true) : undefined;
  const editsTeams =
    (usesFriendlyChrome || usesDrawnTournamentChrome) && canEditTeams(data);
  const openEditTeams = editsTeams ? () => setEditTeamsOpen(true) : undefined;
  const addPlayerToSeat = (seat: FriendlyGameJoinSeat) => {
    setAddSeat(seat);
    setAddPlayerOpen(true);
  };
  const addPlayerToSide = (sideIndex: number) => {
    setAddSide(sideIndex);
    setAddPlayerOpen(true);
  };
  const { firstMatch, winningGameTeamId, canLeaveGame } = plan;
  const playedMatch =
    usesFriendlyChrome && data.phase === "final" ? firstMatch : undefined;
  const heroInput = friendlyGameHeroInput(data);
  const ctaFamily = usesFriendlyChrome
    ? plan.ctaFamily
    : { kind: "none" as const };
  const overflowItems = usesFriendlyChrome ? plan.overflowItems : [];
  const headerJoin = usesDrawnTournamentSeats && data.canRegister;
  const headerJoinWaitlist = usesDrawnTournamentSeats && data.canWaitlist;
  const headerActions =
    usesFriendlyChrome || !(headerJoin || headerJoinWaitlist) ? null : (
      <>
        {headerJoin ? (
          <Button
            type="button"
            className="min-h-11"
            disabled={registerSeat.isPending}
            onClick={() => openJoinPicker()}
          >
            {m.game.cta.join}
          </Button>
        ) : null}
        {headerJoinWaitlist ? (
          <Button
            type="button"
            className="min-h-11"
            disabled={registerSeat.isPending}
            onClick={() => registerSeat.mutate({ gameId: id })}
          >
            {m.game.cta.joinWaitlist}
          </Button>
        ) : null}
      </>
    );
  const vacantSeatCount = vacantJoinSeats(data.sides).length;
  const footerActions =
    usesFriendlyChrome && data.phase && data.phase !== "cancelled" && firstMatch
      ? friendlyGameFooterActions({
          phase: data.phase,
          isOrganizer: data.isOrganizer,
          canLeaveGame,
          canReportWrongScore: data.canReportWrongScore,
          playerCount: occupiedFriendlyPositions(data.sides),
          locale,
        })
      : [];
  const footerHandlers = {
    edit: () => setEditOpen(true),
    cancel_game: () => setCancelGameOpen(true),
    mark_as_not_played: () => setMarkAsNotPlayedOpen(true),
    report_wrong_score: () => setReportWrongScoreOpen(true),
    report_wrong_score_locked: () => undefined,
    leave_game: () => setLeaveGameOpen(true),
  } as const;
  const gameMenu = (ink: boolean) =>
    usesFriendlyChrome ? (
      <FriendlyGameMenu
        title={gameName}
        overflowItems={overflowItems}
        footerActions={footerActions}
        ink={ink}
        closePending={closeRegistration.isPending}
        reopenPending={reopenRegistration.isPending}
        onCloseRegistration={() => closeRegistration.mutate({ gameId: id })}
        onReopenRegistration={() => reopenRegistration.mutate({ gameId: id })}
        onAddPlayer={openAddPlayer}
        onEditTeams={openEditTeams}
        onFooterAction={(kind) => footerHandlers[kind]()}
        onLeaveWaitlist={() => setLeaveWaitlistOpen(true)}
      />
    ) : null;
  const shareLink = friendlyGameShareLink({
    canMintInvite: canManageGameInvites,
    cancelled: data.cancelledAt != null,
    phase: data.phase ?? null,
  });
  const heroActions = (
    <>
      {data.challenge ? (
        <ChallengeTag label={m.challenge.gameDetails.tag} tone="ink" />
      ) : null}
      {shareLink ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={g.shareGame}
          className="border-dimrule bg-raised text-on-focus hover:bg-raised/80 hover:text-on-focus rounded-md border"
          onClick={
            shareLink === "invite_link" ? shareInviteLink : shareGamePage
          }
        >
          <Share aria-hidden="true" className="size-5" />
        </Button>
      ) : null}
      {gameMenu(true)}
    </>
  );
  const heroPlace = data.venue
    ? {
        name: data.venue.name,
        line:
          [firstMatch?.courtName, data.venue.city]
            .filter(Boolean)
            .join(" · ") || null,
        directionsUrl: friendlyGameVenueDirectionsUrl(data.venue, locale),
      }
    : null;
  const heroFigures = courtFigures({
    seatedCount: occupiedFriendlyPositions(data.sides),
    seatCount: data.sides.length * 2,
    durationInMinutes: firstMatch?.durationInMinutes ?? null,
    pricePerPlayerFils: data.pricePerPlayerFils,
    locale,
  });
  const vacantAction = friendlyGameVacantSeatAction({
    cancelled: data.cancelledAt != null,
    canMove: data.canMove,
    canRegister: data.canRegister,
    canPickSeat: false,
    canWaitlist: false,
  });
  const canAddAtSeat = canAddPlayer && addPlacement === "seat";
  const openSeatAction = (
    sideIndex: number,
    position: "left" | "right",
  ): OpenSeatAction | null => {
    const sideLabel = formatGameSideLabel("friendly_game", sideIndex, locale);
    const positionLabel = courtPositionLabel(position, locale);
    if ((vacantAction === "move" || vacantAction === "join") && canAddAtSeat) {
      const own = vacantAction;
      return {
        label: m.editTeams.openSpot.title(
          editTeamsSpotLabel("friendly_game", { sideIndex, position }, locale),
        ),
        onClick: () => setOpenSpot({ seat: { sideIndex, position }, own }),
      };
    }
    if (vacantAction === "move" || vacantAction === "join") {
      return {
        label:
          friendlyGameVacantSeatLabel(
            vacantAction,
            sideLabel,
            positionLabel,
            locale,
          ) ?? positionLabel,
        onClick: () =>
          vacantAction === "move"
            ? moveSeat.mutate({ gameId: id, sideIndex, position })
            : openJoinPicker({ sideIndex, position }),
      };
    }
    return canAddAtSeat
      ? {
          label: g.addPlayerTo(sideLabel, positionLabel),
          onClick: () => addPlayerToSeat({ sideIndex, position }),
        }
      : null;
  };
  const leadLine =
    ctaFamily.kind === "needs_score" && firstMatch
      ? scoreLeadLine(firstMatch, plan.viewerGameTeamId, locale)
      : null;
  const seatedTeamName = viewerTeamName(data.sides, data.viewerUserId, locale);
  const ctaLines =
    ctaFamily.kind === "join"
      ? {
          title: courtSpotsLabel(vacantSeatCount, locale),
          subline: m.game.sides.sideIsOptional,
        }
      : ctaFamily.kind === "upcoming" && seatedTeamName
        ? {
            title: m.game.sides.youreInTeam(seatedTeamName),
            subline:
              friendlyGameVacantSeatLine(
                ctaFamily.vacantSeatCount,
                ctaFamily.live,
                locale,
              ) ?? viewerSideOpenLine(data.sides, data.viewerUserId, locale),
          }
        : leadLine
          ? {
              title: leadLine,
              subline: friendlyGameCtaCopy(ctaFamily, locale)?.subline ?? null,
            }
          : null;
  const organizerMenu = usesFriendlyChrome ? null : showMenu ||
    primaryLeave ||
    primaryLeaveWaitlist ? (
    <GameActionsSheet
      title={gameName}
      label={g.actionsLabel}
      groups={[
        [
          ...(showMenu
            ? [
                {
                  key: "edit",
                  label: m.game.action.editGame,
                  icon: PencilIcon,
                  onSelect: () => setEditOpen(true),
                },
                data.registrationClosedAt
                  ? {
                      key: "reopen_registration",
                      label: m.game.action.reopenRegistration,
                      icon: LockOpenIcon,
                      disabled: reopenRegistration.isPending,
                      onSelect: () => reopenRegistration.mutate({ gameId: id }),
                    }
                  : {
                      key: "close_registration",
                      label: m.game.action.closeRegistration,
                      icon: LockIcon,
                      disabled: closeRegistration.isPending,
                      onSelect: () => closeRegistration.mutate({ gameId: id }),
                    },
                ...(canManageGameInvites
                  ? [
                      {
                        key: "invite",
                        label: g.invite,
                        icon: UserRoundPlusIcon,
                        onSelect: () => setInvitesOpen(true),
                      },
                    ]
                  : []),
                ...(openAddPlayer
                  ? [
                      {
                        key: "add_player",
                        label: m.group.addPlayer.action,
                        icon: UserPlusIcon,
                        onSelect: openAddPlayer,
                      },
                    ]
                  : []),
              ]
            : []),
          ...(primaryLeave
            ? [
                {
                  key: "leave",
                  label: m.game.action.leaveGame,
                  icon: LogOutIcon,
                  iconClassName: "rtl:-scale-x-100",
                  onSelect: () => setLeaveGameOpen(true),
                },
              ]
            : []),
          ...(primaryLeaveWaitlist
            ? [
                {
                  key: "leave_waitlist",
                  label: m.game.action.leaveWaitlist,
                  icon: LogOutIcon,
                  iconClassName: "rtl:-scale-x-100",
                  onSelect: () => setLeaveWaitlistOpen(true),
                },
              ]
            : []),
        ],
        showMenu
          ? [
              {
                key: "cancel",
                label: m.game.action.cancelGame,
                icon: Ban,
                tone: "danger" as const,
                onSelect: () => setCancelGameOpen(true),
              },
            ]
          : [],
      ]}
    />
  ) : null;

  function openJoinPicker(seat?: FriendlyGameJoinSeat) {
    setJoinPickerSeat(seat ?? null);
    setJoinPickerOpen(true);
  }

  function requestKick(request: GameKickRequest) {
    if (!data) {
      return;
    }
    setKickConfirm(gameKickTarget(data, request, locale));
  }

  const kickConfirmCopy = kickConfirm
    ? gameKickConfirmCopy(
        kickConfirm,
        {
          partnerRequired: isPartnerRequiredGame(data),
          drawPosted: Boolean(data.drawPostedAt),
        },
        locale,
      )
    : null;

  return (
    <DashboardShell
      title={shellTitle}
      hidePageHeader
      hideMobileTopBar={usesDrawnTournamentChrome || usesFriendlyChrome}
      isSubPage={true}
      hideNav={true}
    >
      <div
        className={cn(
          "space-y-6",
          ctaFamily.kind !== "none" && !playedMatch && "max-lg:pb-20",
          ctaFamily.kind !== "none" &&
            !playedMatch &&
            !(usesFriendlyChrome && heroInput) &&
            "mt-6",
        )}
      >
        {(usesFriendlyChrome || usesDrawnTournamentChrome) &&
        data.cancelledAt ? (
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
                {g.cancelledHeading}
              </p>
            </div>
          </section>
        ) : null}

        {usesDrawnTournamentChrome ? (
          <>
            <TournamentHome
              data={data}
              linkToPlayers={gamePlayersLink(data)}
              sharePending={createInviteLink.isPending}
              joinPending={registerSeat.isPending}
              leavePending={leaveGame.isPending || leaveWaitlist.isPending}
              kickPending={kick.isPending}
              closePending={closeRegistration.isPending}
              reopenPending={reopenRegistration.isPending}
              mergePending={mergeHalfTeams.isPending}
              mergeError={mergeHalfTeams.error}
              onMerge={async (input) => {
                await mergeHalfTeams.mutateAsync({
                  gameId: id,
                  ...input,
                });
              }}
              drawPending={drawPools.isPending}
              drawError={drawPools.error}
              onDraw={async () => {
                await drawPools.mutateAsync({ gameId: id });
              }}
              postPending={postPoolDraw.isPending}
              postError={postPoolDraw.error}
              onPost={async () => {
                await postPoolDraw.mutateAsync({
                  gameId: id,
                  rounds: knockoutOnlyDraw() ? "all" : "later",
                });
              }}
              undoPending={undoPoolDraw.isPending}
              undoError={undoPoolDraw.error}
              onUndo={async () => {
                await undoPoolDraw.mutateAsync({ gameId: id });
              }}
              onShare={canManageGameInvites ? shareInviteLink : undefined}
              onInvite={
                canManageGameInvites ? () => setInvitesOpen(true) : undefined
              }
              onJoin={
                usesDrawnTournamentSeats
                  ? (seat) => openJoinPicker(seat)
                  : undefined
              }
              onJoinWaitlist={
                usesDrawnTournamentSeats
                  ? () => registerSeat.mutate({ gameId: id })
                  : undefined
              }
              teamId={teamId}
              onTeamIdChange={setTeamId}
              onRegisterTeam={(nextTeamId) =>
                registerTeam.mutate({ gameId: id, teamId: nextTeamId })
              }
              registerTeamPending={registerTeam.isPending}
              onLeaveGame={() => setLeaveGameOpen(true)}
              onLeaveWaitlist={() => setLeaveWaitlistOpen(true)}
              onEdit={() => setEditOpen(true)}
              onCloseRegistration={() =>
                closeRegistration.mutate({ gameId: id })
              }
              onReopenRegistration={() =>
                reopenRegistration.mutate({ gameId: id })
              }
              onCancelGame={() => setCancelGameOpen(true)}
              onKick={(userId) => requestKick({ userId })}
              onKickWaitlist={(waitlistId) => requestKick({ waitlistId })}
              onAddPlayer={openAddPlayer}
              onEditTeams={openEditTeams}
              onOpenSeat={
                canAddPlayer && addPlacement === "side"
                  ? (seat, canJoin) => {
                      if (canJoin) {
                        setOpenSpot({ seat, own: "join" });
                        return;
                      }
                      addPlayerToSide(seat.sideIndex);
                    }
                  : undefined
              }
              onCancelKnockoutMatch={setCancelKnockoutPlace}
            />
          </>
        ) : usesFriendlyChrome ? (
          <>
            <h1 className="sr-only">{g.friendlyGameHeading}</h1>
            {heroInput && !playedMatch ? (
              <FriendlyGameDetailsHero
                input={heroInput}
                place={heroPlace}
                figures={heroFigures}
                actions={heroActions}
              />
            ) : playedMatch ? null : (
              <HeroNavRow tone="paper" actions={gameMenu(false)} />
            )}
          </>
        ) : (
          <GameHomeHeader
            name={gameName}
            groupId={data.groupId}
            groupName={data.groupName}
            sport={data.sport}
            isPublic={data.isPublic}
            format={data.format}
            registrationMode={data.registrationMode}
            registrationStatus={data.registrationStatus}
            viewerStatus={gameViewerStatus(data)}
            primaryAction={headerActions}
            actions={organizerMenu}
          />
        )}

        {usesFriendlyChrome && ctaFamily.kind !== "none" && !playedMatch ? (
          <div className="max-lg:contents">
            <FriendlyGameCtaBar
              family={ctaFamily}
              lines={ctaLines}
              joinPending={registerSeat.isPending}
              waitlistPending={leaveWaitlist.isPending}
              onJoin={() => setJoinPickerOpen(true)}
              onJoinWaitlist={() => registerSeat.mutate({ gameId: id })}
              onLeaveWaitlist={() => setLeaveWaitlistOpen(true)}
              onAddResult={focusResultsSection}
              onInvite={
                ctaFamily.kind === "upcoming" && ctaFamily.showInvite
                  ? () => setInvitesOpen(true)
                  : undefined
              }
              onShareResult={
                ctaFamily.kind === "final"
                  ? () => {
                      void shareLinkWithFeedback(
                        {
                          text: window.location.href,
                          url: window.location.href,
                        },
                        g.toast.linkCopied,
                        locale,
                      );
                    }
                  : undefined
              }
            />
          </div>
        ) : null}

        {usesDrawnTournamentChrome ? null : playedMatch ? (
          <PlayedFriendlyGame
            gameId={id}
            game={data}
            match={playedMatch}
            linkToPlayers={gamePlayersLink(data)}
            onKick={(userId) => requestKick({ userId })}
            onRename={data.isOrganizer ? setRenaming : undefined}
            onAddPlayer={openAddPlayer}
            onReportWrongScore={() => setReportWrongScoreOpen(true)}
          />
        ) : usesFriendlyChrome ? (
          // Hero + Line-up + Score + Rating impact (game-details redesign,
          // TEM-179/TEM-180/TEM-181/TEM-182): the tab bar and Overview tab
          // are gone for this Game format, the Players tab content is
          // replaced by the court Line-up, the Results tab content by the
          // Score section, and the Rating impact block (Final phase only)
          // explains why the viewer's Home level card changed. Editing and
          // destructive actions live only in the hero's ⋮ menu.
          <div className="space-y-6">
            <GameLevelRangePanel game={data} />
            {data.challenge ? (
              <ChallengeDetailsBlock
                challenge={data.challenge}
                sport={data.sport}
              />
            ) : null}
            {data.booking ? (
              <GameBookedBlock
                booking={data.booking}
                ratingScope={data.ratingScope}
              />
            ) : (
              <GameRatingScopeBlock scope={data.ratingScope} />
            )}
            <GameLineupSection
              sides={data.sides}
              viewerUserId={data.viewerUserId}
              vacantSeatCount={vacantSeatCount}
              hint={
                canAddAtSeat && vacantSeatCount > 0
                  ? m.game.court.addPlayerHint
                  : null
              }
              busy={moveSeat.isPending}
              openSeatAction={openSeatAction}
              onInvite={
                canManageGameInvites && vacantSeatCount > 0
                  ? () => setInvitesOpen(true)
                  : undefined
              }
              onPressPlayer={
                gamePlayersLink(data) || data.isOrganizer
                  ? setSelectedPlayer
                  : undefined
              }
              note={lineupSidesNote({
                teams: data.sides,
                viewerUserId: data.viewerUserId,
                canJoin: data.canRegister && vacantSeatCount > 0,
                locale,
              })}
              isOrganizer={data.isOrganizer}
              setSidesPending={setTeamSides.isPending}
              onSetSides={
                data.isOrganizer &&
                (data.phase === "upcoming" ||
                  data.phase === "ongoing" ||
                  data.phase === "needs_results")
                  ? (sideIndex, leftUserId) =>
                      setTeamSides.mutate({ gameId: id, sideIndex, leftUserId })
                  : undefined
              }
              onPickSide={
                !data.isOrganizer &&
                data.phase === "upcoming" &&
                viewerTeam(data.sides, data.viewerUserId)
                  ? () => setPickSideOpen(true)
                  : undefined
              }
            />
            {data.phase && data.phase !== "cancelled" && firstMatch ? (
              <div ref={resultsSectionRef}>
                <GameScoreSection
                  phase={data.phase}
                  match={firstMatch}
                  sides={data.sides}
                  viewerUserId={data.viewerUserId}
                  winningGameTeamId={winningGameTeamId}
                  matchResultConfirmation={data.matchResultConfirmation}
                  isOrganizer={
                    data.matchResultConfirmation?.viewerConfirmsAsOrganizer ??
                    false
                  }
                  courtFull={vacantSeatCount === 0}
                  scorePending={scoreSet.isPending}
                  confirmPending={confirmMatchResult.isPending}
                  onScoreSet={(input) =>
                    scoreSet.mutateAsync({
                      gameId: id,
                      matchId: firstMatch.id,
                      setId: input.setId,
                      slot1GamesWon: input.slot1GamesWon,
                      slot2GamesWon: input.slot2GamesWon,
                    })
                  }
                  onConfirm={() =>
                    confirmMatchResult.mutate({
                      gameId: id,
                      matchId: firstMatch.id,
                    })
                  }
                />
              </div>
            ) : null}
            {data.phase === "final" && data.ratingImpact ? (
              <GameRatingImpactBlock ratingImpact={data.ratingImpact} />
            ) : null}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="gap-4">
            <TabsList
              variant="segmented"
              className="sticky top-[var(--mobile-top-bar-height)] z-20 lg:top-0"
            >
              <TabsTrigger value="overview">{g.tabs.overview}</TabsTrigger>
              <TabsTrigger value="players">{g.tabs.players}</TabsTrigger>
              <TabsTrigger value="results">{g.tabs.results}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="space-y-6">
                {data.drawPostedAt && data.poolTables?.pools.length ? (
                  <TournamentPoolTablesPanel
                    poolTables={data.poolTables}
                    gameTeams={
                      gamePlayersLink(data) ? data.gameTeams : undefined
                    }
                  />
                ) : null}
                <GameOverviewPanel game={data} />
              </div>
            </TabsContent>
            <TabsContent value="players">
              <div className="space-y-6">
                <GamePlayersPanel
                  game={data}
                  onRenameUnclaimed={data.isOrganizer ? setRenaming : undefined}
                  partnerQuery={partnerQuery}
                  selectedPartner={selectedPartner}
                  partnerSide={partnerSide}
                  partnerPosition={partnerPosition}
                  teamId={teamId}
                  partnerSearch={partnerSearch.data}
                  partnerSearchPending={partnerSearch.isFetching}
                  registerWithPartnerPending={registerWithPartner.isPending}
                  partnerError={registerWithPartner.error}
                  registerSeatPending={registerSeat.isPending}
                  moveSeatPending={moveSeat.isPending}
                  kickPending={kick.isPending}
                  registerTeamPending={registerTeam.isPending}
                  onPartnerQueryChange={setPartnerQuery}
                  onSelectedPartnerChange={setSelectedPartner}
                  onPartnerSideChange={setPartnerSide}
                  onPartnerPositionChange={setPartnerPosition}
                  onTeamIdChange={setTeamId}
                  onRegisterSeat={(input) =>
                    registerSeat.mutate({
                      gameId: id,
                      sideIndex: input?.sideIndex,
                      position: input?.position,
                    })
                  }
                  onMoveSeat={(sideIndex, position) =>
                    moveSeat.mutate({ gameId: id, sideIndex, position })
                  }
                  onKick={(userId) => requestKick({ userId })}
                  onKickWaitlist={(waitlistId) => requestKick({ waitlistId })}
                  onRegisterWithPartner={(input) =>
                    registerWithPartner.mutate({ gameId: id, ...input })
                  }
                  onRegisterTeam={(nextTeamId) =>
                    registerTeam.mutate({ gameId: id, teamId: nextTeamId })
                  }
                />
              </div>
            </TabsContent>
            <TabsContent value="results">
              <GameResultsPanel
                format={data.format}
                matches={data.matches}
                gameTeams={data.gameTeams}
                isOrganizer={data.isOrganizer}
                cancelled={Boolean(data.cancelledAt)}
                courts={courts.data ?? []}
                scorePending={scoreSet.isPending}
                completePending={completeMatch.isPending}
                cancelPending={cancelMatch.isPending}
                updatePending={updateMatch.isPending}
                onScoreSet={(input) =>
                  scoreSet.mutate({
                    gameId: id,
                    matchId: input.matchId,
                    setId: input.setId,
                    slot1GamesWon: input.slot1GamesWon,
                    slot2GamesWon: input.slot2GamesWon,
                  })
                }
                onComplete={(matchId) => setCompleteMatchId(matchId)}
                onUpdateCourt={(input) =>
                  updateMatch.mutate({
                    gameId: id,
                    matchId: input.matchId,
                    courtId: input.courtId,
                  })
                }
                onUpdateSlots={(input) =>
                  updateMatch.mutate({
                    gameId: id,
                    matchId: input.matchId,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    durationInMinutes: input.durationInMinutes,
                    courtId: input.courtId,
                    slot1GameTeamId: input.slot1GameTeamId,
                    slot2GameTeamId: input.slot2GameTeamId,
                  })
                }
                onCancelMatch={(matchId) => setCancelMatchId(matchId)}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {isOrganizerActive ? (
        <GameEditDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          edit={edit}
          sections={{ ...editSections, rounds: roundsPlan != null }}
          context={{
            venueName: data.venue?.name ?? null,
            courtName:
              data.booking?.courtName ?? data.recordedCourts[0]?.name ?? null,
            groupName: data.groupName,
            joined: data.registeredUserCount,
            seasons: data.groupSeasons,
            canChangeSeason: data.canChangeSeason,
            rounds: roundsPlan
              ? {
                  poolSizes: roundsPlan.poolSizes,
                  overruns: roundsPlan.overruns,
                }
              : null,
          }}
        />
      ) : null}

      {usesFriendlyChrome || usesDrawnTournamentSeats ? (
        <FriendlyGameJoinSheet
          open={joinPickerOpen}
          onOpenChange={(open) => {
            setJoinPickerOpen(open);
            if (!open) {
              setJoinPickerSeat(null);
            }
          }}
          title={gameName}
          sides={data.sides}
          pending={registerSeat.isPending}
          pricePerPlayerFils={data.pricePerPlayerFils}
          gameId={id}
          format={data.format}
          registrationMode={data.registrationMode}
          canRegister={data.canRegister}
          windowStart={data.windowStart}
          venueName={data.venue?.name ?? null}
          groupName={data.groupName}
          isOrganizer={data.isOrganizer}
          levelMinTenths={data.levelMinTenths}
          levelMaxTenths={data.levelMaxTenths}
          initialSeat={joinPickerSeat}
          poolCount={data.poolCount}
          tournamentShape={data.tournamentShape}
          teamsAllowed={data.teamsAllowed}
          storedRoundCount={data.roundCount}
          windowEnd={data.windowEnd}
          matchMinutes={data.matchMinutes}
          allowSoloRegister={data.allowSoloRegister}
          onPickSeat={(sideIndex, position) =>
            registerSeat.mutateAsync({ gameId: id, sideIndex, position })
          }
        />
      ) : null}

      {usesFriendlyChrome && viewerTeam(data.sides, data.viewerUserId) ? (
        <PickSideDialog
          open={pickSideOpen}
          onOpenChange={setPickSideOpen}
          teams={data.sides}
          viewerUserId={data.viewerUserId}
          pending={setSeatSide.isPending}
          onSave={(side) => setSeatSide.mutate({ gameId: id, side })}
        />
      ) : null}

      {addPlacement && (canAddPlayer || addPlayerOpen) ? (
        <AddPlayerDialog
          open={addPlayerOpen}
          onOpenChange={(open) => {
            setAddPlayerOpen(open);
            if (!open) {
              setAddSeat(null);
              setAddSide(null);
            }
          }}
          gameId={id}
          placement={addPlacement}
          sides={data.sides}
          initialSeat={addSeat}
          initialSide={addSide}
          groupName={data.groupName}
          onAdded={() => utils.games.byId.invalidate({ id })}
        />
      ) : null}

      {editsTeams ? (
        <EditTeamsDialog
          open={editTeamsOpen}
          onOpenChange={setEditTeamsOpen}
          gameId={id}
          format={usesFriendlyChrome ? "friendly_game" : "friendly_tournament"}
          sides={data.sides}
          matches={data.matches}
          rules={{
            fullSidesOnly: isPartnerRequiredGame(data),
            fixedSides: data.drawPostedAt != null,
          }}
          viewerUserId={data.viewerUserId}
          onSaved={() => utils.games.byId.invalidate({ id })}
        />
      ) : null}

      <OpenSpotDialog
        spotLabel={
          openSpot
            ? editTeamsSpotLabel(
                usesFriendlyChrome ? "friendly_game" : "friendly_tournament",
                openSpot.seat,
                locale,
              )
            : null
        }
        own={openSpot?.own ?? "join"}
        onOpenChange={(open) => {
          if (!open) {
            setOpenSpot(null);
          }
        }}
        onAddPlayer={() => {
          if (!openSpot) {
            return;
          }
          if (usesFriendlyChrome) {
            addPlayerToSeat(openSpot.seat);
          } else {
            addPlayerToSide(openSpot.seat.sideIndex);
          }
        }}
        onOwn={() => {
          if (!openSpot) {
            return;
          }
          if (openSpot.own === "move") {
            moveSeat.mutate({ gameId: id, ...openSpot.seat });
          } else {
            openJoinPicker(openSpot.seat);
          }
        }}
      />

      {usesFriendlyChrome && !playedMatch ? (
        <PlayedPlayerDialog
          player={selectedPlayer}
          canOpenProfile={gamePlayersLink(data)}
          canKick={
            selectedPlayer != null &&
            friendlyGameCanKickPlayer({
              isOrganizer: data.isOrganizer,
              cancelled: Boolean(data.cancelledAt),
              isViewer: selectedPlayer.userId === data.viewerUserId,
            })
          }
          canRename={
            data.isOrganizer &&
            selectedPlayer != null &&
            seatedPlayerCanRename(data.sides, selectedPlayer.userId)
          }
          onOpenChange={(open) => {
            if (!open) {
              setSelectedPlayer(null);
            }
          }}
          onKick={(userId) => {
            setSelectedPlayer(null);
            requestKick({ userId });
          }}
          onRename={(player) => {
            setSelectedPlayer(null);
            setRenaming(player);
          }}
        />
      ) : null}
      {data.isOrganizer ? (
        <RenameUnclaimedPlayerDialog
          player={renaming}
          onClose={() => setRenaming(null)}
        />
      ) : null}

      {canManageGameInvites ? (
        <InviteDoorDialog
          door={{
            kind: "game",
            gameId: id,
            canLookup: canSendGameLookup,
            canLink: true,
            subtitle: gameInviteSubtitle(
              {
                windowStart: data.windowStart,
                courtName: data.matches[0]?.courtName ?? null,
                venueName: data.venue?.name ?? null,
                sides: data.sides,
              },
              locale,
            ),
            shareMessage: inviteShareText,
          }}
          open={invitesOpen}
          onOpenChange={setInvitesOpen}
        />
      ) : null}

      <ConfirmDialog
        open={cancelGameOpen}
        onOpenChange={setCancelGameOpen}
        title={g.cancelTitle(gameName)}
        description={
          usesFriendlyChrome
            ? cancelGameConsequence(
                occupiedFriendlyPositions(data.sides),
                locale,
              )
            : m.game.consequence.cannotBeUndone
        }
        confirmLabel={m.game.action.cancelGame}
        pending={cancelGame.isPending}
        onConfirm={async () => {
          await cancelGame.mutateAsync({ gameId: id });
        }}
      />

      <ConfirmDialog
        open={markAsNotPlayedOpen}
        onOpenChange={setMarkAsNotPlayedOpen}
        title={g.markAsNotPlayedTitle}
        description={m.game.consequence.markAsNotPlayed}
        confirmLabel={m.game.action.markAsNotPlayed}
        pending={cancelMatch.isPending}
        onConfirm={async () => {
          if (!firstMatch) {
            return;
          }
          await cancelMatch.mutateAsync({ gameId: id, matchId: firstMatch.id });
        }}
      />

      <ConfirmDialog
        open={reportWrongScoreOpen}
        onOpenChange={setReportWrongScoreOpen}
        title={g.reportWrongScoreTitle}
        description={m.game.consequence.reportWrongScore}
        confirmLabel={m.game.action.reportWrongScore}
        pending={reportWrongScore.isPending}
        onConfirm={async () => {
          if (!firstMatch) {
            return;
          }
          await reportWrongScore.mutateAsync({
            gameId: id,
            matchId: firstMatch.id,
          });
        }}
      />

      <ConfirmDialog
        open={leaveGameOpen}
        onOpenChange={setLeaveGameOpen}
        title={g.leaveTitle(gameName)}
        description={
          usesFriendlyChrome && data.isOrganizer
            ? leaveGameOrganizerConsequence(locale)
            : tournamentLeaveOrKickConfirmCopy({
                partnerRequired: isPartnerRequiredGame(data),
                drawPosted: Boolean(data.drawPostedAt),
                locale,
              })
        }
        confirmLabel={m.game.action.leaveGame}
        pending={leaveGame.isPending}
        onConfirm={async () => {
          await leaveGame.mutateAsync({ gameId: id });
        }}
      />

      <ConfirmDialog
        open={kickConfirm != null}
        onOpenChange={(open) => {
          if (!open) {
            setKickConfirm(null);
          }
        }}
        title={kickConfirmCopy?.title ?? g.kickPlayerTitle}
        description={kickConfirmCopy?.description}
        confirmLabel={m.game.action.kick}
        pending={kick.isPending}
        onConfirm={async () => {
          if (!kickConfirm) {
            return;
          }
          await kick.mutateAsync(
            kickConfirm.kind === "player"
              ? { gameId: id, userId: kickConfirm.userId }
              : { gameId: id, waitlistId: kickConfirm.waitlistId },
          );
          toast.success(kickedToast(kickConfirm.name, locale));
        }}
      />

      <ConfirmDialog
        open={completeMatchId != null}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteMatchId(null);
          }
        }}
        title={g.completeMatchTitle}
        description={m.game.consequence.completeMatch}
        confirmLabel={m.game.action.completeMatch}
        variant="default"
        pending={completeMatch.isPending}
        onConfirm={async () => {
          if (!completeMatchId) {
            return;
          }
          await completeMatch.mutateAsync({
            gameId: id,
            matchId: completeMatchId,
          });
        }}
      />

      <ConfirmDialog
        open={leaveWaitlistOpen}
        onOpenChange={setLeaveWaitlistOpen}
        title={g.leaveWaitlistTitle}
        description={m.game.consequence.leaveWaitlist}
        confirmLabel={m.game.action.leaveWaitlist}
        pending={leaveWaitlist.isPending}
        onConfirm={async () => {
          await leaveWaitlist.mutateAsync({ gameId: id });
        }}
      />

      <ConfirmDialog
        open={cancelMatchId != null}
        onOpenChange={(open) => {
          if (!open) {
            setCancelMatchId(null);
          }
        }}
        title={
          data.format === "friendly_game"
            ? g.cancelTitle(gameName)
            : g.cancelMatchTitle
        }
        description={m.game.consequence.cannotBeUndone}
        confirmLabel={
          data.format === "friendly_game"
            ? m.game.action.cancelGame
            : m.game.action.cancelMatch
        }
        pending={cancelMatch.isPending}
        onConfirm={async () => {
          if (!cancelMatchId) {
            return;
          }
          await cancelMatch.mutateAsync({
            gameId: id,
            matchId: cancelMatchId,
          });
        }}
      />

      <TournamentKnockoutCancelDialog
        place={cancelKnockoutPlace}
        onOpenChange={(open) => {
          if (!open) {
            setCancelKnockoutPlace(null);
          }
        }}
        pending={cancelMatch.isPending}
        onConfirm={async (advancingGameTeamId) => {
          if (!cancelKnockoutPlace?.matchId) {
            return;
          }
          await cancelMatch.mutateAsync({
            gameId: id,
            matchId: cancelKnockoutPlace.matchId,
            advancingGameTeamId,
          });
        }}
      />
    </DashboardShell>
  );
}
