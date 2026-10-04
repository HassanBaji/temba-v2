"use client";

import { Ban } from "lucide-react";
import { notFound, usePathname, useRouter } from "next/navigation";
import { use } from "react";
import * as React from "react";
import { toast } from "sonner";

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { FriendlyGameActionsFooter } from "~/components/games/friendly-game-actions-footer";
import { GameDetailsSkeleton } from "~/components/games/game-details-skeleton";
import { FriendlyGameCtaBar } from "~/components/games/friendly-game-cta-bar";
import { FriendlyGameDetailsHero } from "~/components/games/friendly-game-details-hero";
import { FriendlyGameJoinSheet } from "~/components/games/friendly-game-join-sheet";
import { FriendlyGameOverflowMenu } from "~/components/games/friendly-game-overflow-menu";
import { GameEditDialog } from "~/components/games/game-edit-dialog";
import { GameHomeHeader } from "~/components/games/game-home-header";
import { GameInvitesDialog } from "~/components/games/game-invites-dialog";
import { GameLineupSection } from "~/components/games/game-lineup-section";
import { GameOverviewPanel } from "~/components/games/game-overview-panel";
import { GamePlayersPanel } from "~/components/games/game-players-panel";
import { GameRatingImpactBlock } from "~/components/games/game-rating-impact-block";
import { GameResultsPanel } from "~/components/games/game-results-panel";
import { GameScoreSection } from "~/components/games/game-score-section";
import { TournamentHome } from "~/components/games/tournament-home";
import { TournamentKnockoutCancelDialog } from "~/components/games/tournament-knockout-cancel-dialog";
import { TournamentPoolTablesPanel } from "~/components/games/tournament-pool-tables-panel";
import type { LookupUserSearchRow } from "@repo/api/types";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  focusFormFailure,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import {
  gameEditSectionsToReseed,
  type GameEditSection,
} from "@repo/domain/game-edit-sections";
import {
  CANCEL_GAME_ACTION,
  CANCEL_MATCH_ACTION,
  CANNOT_BE_UNDONE_COPY,
  COMPLETE_MATCH_ACTION,
  COMPLETE_MATCH_CONSEQUENCE,
  EDIT_GAME_ACTION,
  GAME_TOAST,
  KICK_ACTION,
  LEAVE_GAME_ACTION,
  LEAVE_WAITLIST_ACTION,
  LEAVE_WAITLIST_CONSEQUENCE,
  MARK_AS_NOT_PLAYED_ACTION,
  MARK_AS_NOT_PLAYED_CONSEQUENCE,
  REPORT_WRONG_SCORE_ACTION,
  REPORT_WRONG_SCORE_CONSEQUENCE,
  cancelGameConsequence,
  gameJoinToast,
  kickedToast,
} from "@repo/domain/game-copy";
import { occupiedFriendlyPositions } from "@repo/domain/game-invite-open-graph";
import { gameInviteClipboardText } from "@repo/domain/game-invite-share-message";
import {
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRequest,
  type GameKickTarget,
} from "@repo/domain/game-kick-confirm";
import {
  friendlyGameCanMintInvite,
  friendlyGameCtaFamily,
  friendlyGameFooterCanLeaveGame,
  friendlyGameOverflowItems,
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "@repo/domain/friendly-game-cta";
import { friendlyGameHomeTitle } from "@repo/domain/friendly-game-chrome";
import { viewerSidePartnerName } from "@repo/domain/friendly-game-partner";
import {
  gameHomeIntentFromQuery,
  gameHomeTabFromQuery,
  gameHomeTabQuery,
} from "~/lib/game-home-tab";
import { gameViewerStatus } from "@repo/domain/game-summary-cta";
import { gameDetailsChrome } from "@repo/domain/tournament-home";
import { type KnockoutMatchPlace } from "@repo/domain/tournament-knockout-view";
import {
  tournamentInviteLandingOpensPartnerSheet,
  tournamentLeaveOrKickConfirmCopy,
} from "@repo/domain/tournament-join";
import {
  isPartnerRequiredGame,
  hasPools,
  isKnockoutOnly,
  showsDrawnTournamentSeats,
} from "@repo/domain/tournament-rounds";
import {
  isOneDayTournamentWindow,
  sizeTournamentRounds,
} from "@repo/domain/tournament-schedule";
import {
  oneDayFit,
  resolveRoundCount,
  sizeFriendlyTournament,
} from "@repo/domain/tournament-sizing";
import {
  formatGameWindowName,
  parseRequiredGameWindow,
  splitGameWindow,
} from "@repo/domain/game-window";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { shareLinkWithFeedback } from "~/lib/share-link";
import {
  LEVEL_BAND_SELECT_NONE,
  LEVEL_RANGE_INVERTED_MESSAGE,
  parseLevelBandSelectTenths,
  tenthsToLevelBandSelectValue,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import {
  filsToMajorInput,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";
import { api } from "~/trpc/react";

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
  const priceSummaryRef = React.useRef<HTMLDivElement>(null);
  const levelSummaryRef = React.useRef<HTMLDivElement>(null);
  const roundsSummaryRef = React.useRef<HTMLDivElement>(null);
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
  const [windowDay, setWindowDay] = React.useState("");
  const [windowStartTime, setWindowStartTime] = React.useState("");
  const [windowFinishTime, setWindowFinishTime] = React.useState("");
  const [pricePerPlayer, setPricePerPlayer] = React.useState("");
  const [pricePerPlayerError, setPricePerPlayerError] = React.useState<
    string | undefined
  >();
  const [levelMin, setLevelMin] = React.useState<LevelBandSelectValue>(
    LEVEL_BAND_SELECT_NONE,
  );
  const [levelMax, setLevelMax] = React.useState<LevelBandSelectValue>(
    LEVEL_BAND_SELECT_NONE,
  );
  const [levelMinError, setLevelMinError] = React.useState<
    string | undefined
  >();
  const [levelMaxError, setLevelMaxError] = React.useState<
    string | undefined
  >();
  const [roundCount, setRoundCount] = React.useState<number | null>(null);
  const [lookupQuery, setLookupQuery] = React.useState("");
  const [lookupRefused, setLookupRefused] = React.useState<
    { name: string; message: string }[] | null
  >(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const justSavedEditSectionsRef = React.useRef(new Set<GameEditSection>());
  const [invitesOpen, setInvitesOpen] = React.useState(false);
  const [cancelGameOpen, setCancelGameOpen] = React.useState(false);
  const [leaveGameOpen, setLeaveGameOpen] = React.useState(false);
  const [leaveWaitlistOpen, setLeaveWaitlistOpen] = React.useState(false);
  const [cancelMatchId, setCancelMatchId] = React.useState<string | null>(null);
  const [cancelKnockoutPlace, setCancelKnockoutPlace] =
    React.useState<KnockoutMatchPlace | null>(null);
  const [joinPickerOpen, setJoinPickerOpen] = React.useState(false);
  const [joinPickerSeat, setJoinPickerSeat] =
    React.useState<FriendlyGameJoinSeat | null>(null);
  const [kickConfirm, setKickConfirm] = React.useState<GameKickTarget | null>(
    null,
  );
  const [completeMatchId, setCompleteMatchId] = React.useState<string | null>(
    null,
  );
  const [markAsNotPlayedOpen, setMarkAsNotPlayedOpen] = React.useState(false);
  const [reportWrongScoreOpen, setReportWrongScoreOpen] = React.useState(false);

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: async (result) => {
      toast.success(gameJoinToast(result.waitlisted));
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
      toast.success(GAME_TOAST.seatChanged);
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: async (result) => {
      toast.success(gameJoinToast(result.waitlisted));
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
      toast.success(
        result.waitlisted
          ? GAME_TOAST.teamJoinedWaitlist
          : GAME_TOAST.teamRegistered,
      );
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
      toast.success(GAME_TOAST.halfTeamsMerged);
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
        knockoutOnlyDraw() ? GAME_TOAST.knockoutDrawn : GAME_TOAST.poolsDrawn,
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
          ? GAME_TOAST.knockoutDrawPosted
          : GAME_TOAST.poolDrawPosted,
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
          ? GAME_TOAST.knockoutDrawUndone
          : GAME_TOAST.poolDrawUndone,
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
      toast.success(GAME_TOAST.left);
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
      toast.success(GAME_TOAST.leftWaitlist);
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
      toast.success(GAME_TOAST.registrationClosed);
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const reopenRegistration = api.games.reopenRegistration.useMutation({
    onSuccess: async () => {
      toast.success(GAME_TOAST.registrationReopened);
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const cancelGame = api.games.cancel.useMutation({
    onSuccess: async () => {
      toast.success(GAME_TOAST.gameCancelled);
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
          ? GAME_TOAST.gameCancelled
          : GAME_TOAST.matchCancelled,
      );
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const updateWindow = api.games.updateWindow.useMutation({
    onSuccess: async () => {
      justSavedEditSectionsRef.current.add("window");
      toast.success("Window saved");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const updatePricePerPlayer = api.games.updatePricePerPlayer.useMutation({
    onSuccess: async () => {
      justSavedEditSectionsRef.current.add("price");
      toast.success("Price per player saved");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(
        error,
        { pricePerPlayerFils: "edit-price-per-player" },
        priceSummaryRef.current,
      );
    },
  });

  const updateLevelRange = api.games.updateLevelRange.useMutation({
    onSuccess: async () => {
      justSavedEditSectionsRef.current.add("level");
      toast.success("Level range saved");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(
        error,
        {
          levelMinTenths: "edit-level-min",
          levelMaxTenths: "edit-level-max",
        },
        levelSummaryRef.current,
      );
    },
  });

  const updateRoundCount = api.games.updateRoundCount.useMutation({
    onSuccess: async () => {
      justSavedEditSectionsRef.current.add("rounds");
      toast.success("Rounds saved");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(
        error,
        { roundCount: "edit-round-count" },
        roundsSummaryRef.current,
      );
    },
  });

  const updateMatch = api.games.updateMatch.useMutation({
    onSuccess: async () => {
      toast.success("Match updated");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const scoreSet = api.games.scoreSet.useMutation({
    onSuccess: async () => {
      toast.success("Set saved");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const completeMatch = api.games.completeMatch.useMutation({
    onSuccess: async () => {
      toast.success("Match completed");
      await refreshGame();
      await utils.ratings.me.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const confirmMatchResult = api.games.confirmMatchResult.useMutation({
    onSuccess: async () => {
      toast.success("Result confirmed");
      await refreshGame();
      await utils.ratings.me.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const reportWrongScore = api.games.reportWrongScore.useMutation({
    onSuccess: async () => {
      toast.success("Score reopened");
      await refreshGame();
      await utils.ratings.me.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const sendLookupInvite = api.games.sendLookupInvite.useMutation({
    onSuccess: async (result) => {
      setLookupRefused(result.refused);
      if (result.sent.length > 0) {
        toast.success(
          result.sent.length === 1
            ? "Lookup invite sent"
            : `${result.sent.length} Lookup invites sent`,
        );
      }
      await utils.games.listLookupInvites.invalidate({ gameId: id });
      await utils.games.searchLookupUsers.invalidate({ gameId: id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const createInviteLink = api.games.createInviteLink.useMutation({
    onSuccess: async (result) => {
      const url = result.shortUrl ?? result.inviteUrl;
      const row = game.data;
      const text = gameInviteClipboardText({
        format: row?.format ?? "",
        registrationMode: row?.registrationMode ?? "",
        shortUrl: url,
        roster: row
          ? {
              venueName: row.venue?.name ?? "Venue",
              courtName: row.matches[0]?.courtName ?? null,
              windowStart: row.windowStart,
              windowEnd: row.windowEnd,
              sides: row.sides,
              shortUrl: url,
            }
          : null,
      });
      await shareLinkWithFeedback({ text }, "Invite link copied");
      await utils.games.getInviteLink.invalidate({ gameId: id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const data = game.data;
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
  const canMintInvite = data ? friendlyGameCanMintInvite(data) : false;
  const canManageGameInvites = usesFriendlyChrome
    ? canMintInvite
    : Boolean(data?.isOrganizer && !data.cancelledAt && !data.joinFrozen);
  const canSendGameLookup = Boolean(
    canManageGameInvites &&
      data?.registrationMode !== "team_only" &&
      !(data && isPartnerRequiredGame(data)),
  );
  const lookupSearch = api.games.searchLookupUsers.useQuery(
    { gameId: id, query: lookupQuery },
    { enabled: invitesOpen && canSendGameLookup },
  );
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
  const inviteLink = api.games.getInviteLink.useQuery(
    { gameId: id },
    { enabled: canManageGameInvites },
  );

  React.useEffect(() => {
    if (firstEligibleTeam && teamId.length === 0) {
      setTeamId(firstEligibleTeam);
    }
  }, [firstEligibleTeam, teamId.length]);

  React.useEffect(() => {
    if (!data) {
      return;
    }
    const sections = gameEditSectionsToReseed({
      dialogOpen: editOpen,
      justSaved: justSavedEditSectionsRef.current,
    });
    justSavedEditSectionsRef.current.clear();
    if (sections.includes("window")) {
      const gameWindow = splitGameWindow(data.windowStart, data.windowEnd);
      setWindowDay(gameWindow.day);
      setWindowStartTime(gameWindow.startTime);
      setWindowFinishTime(gameWindow.finishTime);
    }
    if (sections.includes("price")) {
      setPricePerPlayer(filsToMajorInput(data.pricePerPlayerFils));
      setPricePerPlayerError(undefined);
    }
    if (sections.includes("level")) {
      setLevelMin(tenthsToLevelBandSelectValue(data.levelMinTenths));
      setLevelMax(tenthsToLevelBandSelectValue(data.levelMaxTenths));
      setLevelMinError(undefined);
      setLevelMaxError(undefined);
    }
    if (sections.includes("rounds")) {
      setRoundCount(data.roundCount);
    }
  }, [data, editOpen]);

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
      <DashboardShell title="Game" hidePageHeader isSubPage hideNav>
        <GameDetailsSkeleton />
      </DashboardShell>
    );
  }

  if (game.error) {
    return (
      <DashboardShell title="Game">
        <ErrorState
          title="Game could not be loaded"
          message={game.error.message}
          onRetry={() => {
            void game.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell title="Game">
        <ErrorState
          title="Game could not be loaded"
          onRetry={() => {
            void game.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const gameName = data.name ?? "Game";
  const shellTitle = usesFriendlyChrome
    ? friendlyGameHomeTitle(data.groupId, data.groupName)
    : "Game";
  const isOrganizerActive = data.isOrganizer && !data.cancelledAt;
  const plannedSizing =
    hasPools(data.format, data.poolCount) &&
    data.poolCount != null &&
    !data.drawPostedAt
      ? sizeFriendlyTournament(data.teamsAllowed ?? 0, data.poolCount)
      : null;
  const editRoundsPoolSizes = plannedSizing?.ok
    ? plannedSizing.sizing.poolSizes
    : null;
  const editRoundCount =
    editRoundsPoolSizes != null
      ? resolveRoundCount(editRoundsPoolSizes, roundCount)
      : null;
  const editRoundsOverrun =
    editRoundsPoolSizes != null &&
    editRoundCount != null &&
    data.windowStart != null &&
    data.windowEnd != null &&
    data.recordedCourts.length > 0 &&
    isOneDayTournamentWindow(data.windowStart, data.windowEnd) &&
    oneDayFit({
      start: data.windowStart,
      finish: data.windowEnd,
      roundMatches: sizeTournamentRounds(editRoundsPoolSizes, editRoundCount)
        .roundMatches,
      courtCount: data.recordedCourts.length,
      matchMinutes: data.matchMinutes,
    }).overruns;
  const showMenu = isOrganizerActive;
  const primaryLeave = data.isRegistered && data.canLeave && !data.isWaitlisted;
  const primaryLeaveWaitlist = data.isWaitlisted;
  const firstMatch = data.matches[0];
  const canScoreSets = data.matches.some((match) => match.canScoreSets);
  const viewerGameTeamId =
    data.sides.find(
      (side) =>
        side.left?.userId === data.viewerUserId ||
        side.right?.userId === data.viewerUserId,
    )?.gameTeamId ?? null;
  const partnerBesideName = viewerSidePartnerName({
    viewerUserId: data.viewerUserId,
    sides: data.sides,
  });
  // Line-up section's winning-team "Won" tag (game-details redesign,
  // TEM-180): the Match's own Game-team id for whichever slot the outcome
  // names, resolved once here rather than re-deriving it inside the section
  // component. `null` on a draw/no-result outcome (no tag renders).
  const winningGameTeamId =
    data.phase === "final" && firstMatch
      ? firstMatch.outcome.result === "slot1"
        ? firstMatch.slot1GameTeamId
        : firstMatch.outcome.result === "slot2"
          ? firstMatch.slot2GameTeamId
          : null
      : null;
  const ctaFamily = usesFriendlyChrome
    ? friendlyGameCtaFamily({
        cancelled: Boolean(data.cancelledAt),
        phase: data.phase,
        canScoreSets,
        canWaitlist: data.canWaitlist,
        isWaitlisted: data.isWaitlisted,
        waitlistPlace: data.waitlistPlace,
        canRegister: data.canRegister,
        isSeated: data.isSeated,
        isRegistered: data.isRegistered,
        canMintInvite,
        vacantSeatCount: vacantJoinSeats(data.sides).length,
        ratingImpact: data.ratingImpact,
      })
    : { kind: "none" as const };
  const overflowItems = usesFriendlyChrome
    ? friendlyGameOverflowItems({
        isOrganizer: data.isOrganizer,
        cancelled: Boolean(data.cancelledAt),
        registrationClosed: Boolean(data.registrationClosedAt),
        canMintInvite,
        isWaitlisted: data.isWaitlisted,
      })
    : [];
  // Organiser actions footer (game-details redesign, TEM-184, amended
  // TEM-193): Leave Game for every seated/registered non-waitlisted User
  // who `canLeave`, including an organizer who sits. Distinct from Cancel.
  const canLeaveGame = friendlyGameFooterCanLeaveGame({
    isSeated: data.isSeated,
    isRegistered: data.isRegistered,
    canLeave: data.canLeave,
    isWaitlisted: data.isWaitlisted,
  });
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
            Join
          </Button>
        ) : null}
        {headerJoinWaitlist ? (
          <Button
            type="button"
            className="min-h-11"
            disabled={registerSeat.isPending}
            onClick={() => registerSeat.mutate({ gameId: id })}
          >
            Join waitlist
          </Button>
        ) : null}
      </>
    );
  const overflowHandlers = {
    closePending: closeRegistration.isPending,
    reopenPending: reopenRegistration.isPending,
    onCloseRegistration: () => closeRegistration.mutate({ gameId: id }),
    onReopenRegistration: () => reopenRegistration.mutate({ gameId: id }),
    onInvite: () => setInvitesOpen(true),
    onShare: () => createInviteLink.mutate({ gameId: id }),
    onLeaveWaitlist: () => setLeaveWaitlistOpen(true),
  };
  const mobileOverflow =
    usesFriendlyChrome && overflowItems.length > 0 ? (
      <FriendlyGameOverflowMenu items={overflowItems} {...overflowHandlers} />
    ) : null;
  const desktopOverflow =
    usesFriendlyChrome && overflowItems.length > 0 ? (
      <FriendlyGameOverflowMenu items={overflowItems} {...overflowHandlers} />
    ) : null;
  const organizerMenu = usesFriendlyChrome ? null : showMenu ||
    primaryLeave ||
    primaryLeaveWaitlist ? (
    <ActionMenu label="Game actions">
      {showMenu ? (
        <>
          <ActionMenuItem onSelect={() => setEditOpen(true)}>
            {EDIT_GAME_ACTION}
          </ActionMenuItem>
          {data.registrationClosedAt ? (
            <ActionMenuItem
              disabled={data.joinFrozen || reopenRegistration.isPending}
              onSelect={() => reopenRegistration.mutate({ gameId: id })}
            >
              Reopen registration
            </ActionMenuItem>
          ) : (
            <ActionMenuItem
              disabled={closeRegistration.isPending}
              onSelect={() => closeRegistration.mutate({ gameId: id })}
            >
              Close registration
            </ActionMenuItem>
          )}
          {canManageGameInvites ? (
            <ActionMenuItem onSelect={() => setInvitesOpen(true)}>
              Invite
            </ActionMenuItem>
          ) : null}
        </>
      ) : null}
      {primaryLeave ? (
        <ActionMenuItem onSelect={() => setLeaveGameOpen(true)}>
          {LEAVE_GAME_ACTION}
        </ActionMenuItem>
      ) : null}
      {primaryLeaveWaitlist ? (
        <ActionMenuItem onSelect={() => setLeaveWaitlistOpen(true)}>
          {LEAVE_WAITLIST_ACTION}
        </ActionMenuItem>
      ) : null}
      {showMenu ? (
        <>
          <ActionMenuSeparator />
          <ActionMenuItem
            variant="destructive"
            onSelect={() => setCancelGameOpen(true)}
          >
            {CANCEL_GAME_ACTION}
          </ActionMenuItem>
        </>
      ) : null}
    </ActionMenu>
  ) : null;

  function saveWindow() {
    const gameWindow = parseRequiredGameWindow(
      windowDay,
      windowStartTime,
      windowFinishTime,
    );
    if (!gameWindow) {
      return;
    }
    updateWindow.mutate({
      gameId: id,
      name: formatGameWindowName(windowDay, windowStartTime, windowFinishTime),
      windowStart: gameWindow.windowStart,
      windowEnd: gameWindow.windowEnd,
    });
  }

  function savePrice() {
    if (updatePricePerPlayer.isPending) {
      return;
    }
    setPricePerPlayerError(undefined);
    const parsedPrice = parseOptionalPricePerPlayerFils(pricePerPlayer);
    if (!parsedPrice.ok) {
      setPricePerPlayerError(parsedPrice.message);
      document.getElementById("edit-price-per-player")?.focus();
      return;
    }
    updatePricePerPlayer.mutate({
      gameId: id,
      pricePerPlayerFils: parsedPrice.fils,
    });
  }

  function saveLevelRange() {
    if (updateLevelRange.isPending) {
      return;
    }
    setLevelMinError(undefined);
    setLevelMaxError(undefined);
    const parsedMin = parseLevelBandSelectTenths(levelMin, "min");
    const parsedMax = parseLevelBandSelectTenths(levelMax, "max");
    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      setLevelMinError(LEVEL_RANGE_INVERTED_MESSAGE);
      document.getElementById("edit-level-min")?.focus();
      return;
    }
    updateLevelRange.mutate({
      gameId: id,
      levelMinTenths: parsedMin,
      levelMaxTenths: parsedMax,
    });
  }

  function saveRounds() {
    if (updateRoundCount.isPending) {
      return;
    }
    updateRoundCount.mutate({ gameId: id, roundCount });
  }

  function openJoinPicker(seat?: FriendlyGameJoinSeat) {
    setJoinPickerSeat(seat ?? null);
    setJoinPickerOpen(true);
  }

  function requestKick(request: GameKickRequest) {
    if (!data) {
      return;
    }
    setKickConfirm(gameKickTarget(data, request));
  }

  const kickConfirmCopy = kickConfirm
    ? gameKickConfirmCopy(kickConfirm, {
        partnerRequired: isPartnerRequiredGame(data),
        drawPosted: Boolean(data.drawPostedAt),
      })
    : null;

  return (
    <DashboardShell
      title={shellTitle}
      hidePageHeader
      hideMobileTopBar={usesDrawnTournamentChrome}
      action={mobileOverflow}
      isSubPage={true}
      hideNav={true}
    >
      <div
        className={
          ctaFamily.kind !== "none"
            ? "mt-6 space-y-6 max-lg:pb-20"
            : "space-y-6"
        }
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
                This Game is cancelled
              </p>
            </div>
          </section>
        ) : null}

        {usesDrawnTournamentChrome ? (
          <>
            {data.joinFrozen && !data.cancelledAt ? (
              <SoftArchiveBanner
                headingLevel={2}
                heading="This Club Group's Community is Soft-archived"
              >
                Registration, the waitlist, and invites stay closed.
              </SoftArchiveBanner>
            ) : null}
            <TournamentHome
              data={data}
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
                await postPoolDraw.mutateAsync({ gameId: id });
              }}
              undoPending={undoPoolDraw.isPending}
              undoError={undoPoolDraw.error}
              onUndo={async () => {
                await undoPoolDraw.mutateAsync({ gameId: id });
              }}
              onShare={
                canManageGameInvites
                  ? () => createInviteLink.mutate({ gameId: id })
                  : undefined
              }
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
              onCancelKnockoutMatch={setCancelKnockoutPlace}
            />
          </>
        ) : usesFriendlyChrome ? (
          <>
            <h1 className="sr-only">Friendly Game</h1>
            {desktopOverflow ? (
              <div className="hidden justify-end lg:flex">
                {desktopOverflow}
              </div>
            ) : null}
            {data.phase && data.phase !== "cancelled" ? (
              <FriendlyGameDetailsHero
                phase={data.phase}
                windowStart={data.windowStart}
                windowEnd={data.windowEnd}
                venueName={data.venue?.name ?? null}
                venueCity={data.venue?.city ?? null}
                courtName={firstMatch?.courtName ?? null}
                pricePerPlayerFils={data.pricePerPlayerFils}
                match={
                  firstMatch
                    ? {
                        startTime: firstMatch.startTime,
                        durationInMinutes: firstMatch.durationInMinutes,
                        slot1GameTeamId: firstMatch.slot1GameTeamId,
                        slot2GameTeamId: firstMatch.slot2GameTeamId,
                        sets: firstMatch.sets,
                        outcome: firstMatch.outcome,
                      }
                    : null
                }
                viewerGameTeamId={viewerGameTeamId}
                partnerBesideName={partnerBesideName}
              />
            ) : null}
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

        {usesFriendlyChrome && ctaFamily.kind !== "none" ? (
          <div className="max-lg:contents">
            <FriendlyGameCtaBar
              family={ctaFamily}
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
                        "Link copied",
                      );
                    }
                  : undefined
              }
            />
          </div>
        ) : null}

        {data.joinFrozen && !data.cancelledAt && !usesDrawnTournamentChrome ? (
          <SoftArchiveBanner
            headingLevel={2}
            heading="This Club Group's Community is Soft-archived"
          >
            Registration, the waitlist, and invites stay closed.
          </SoftArchiveBanner>
        ) : null}

        {usesDrawnTournamentChrome ? null : usesFriendlyChrome ? (
          // Hero + Line-up + Score + Rating impact + organiser actions
          // footer scope (game-details redesign,
          // TEM-179/TEM-180/TEM-181/TEM-182/TEM-184): the tab bar and
          // Overview tab are gone for this Game format, the Players tab
          // content is replaced by the Line-up section, the Results tab
          // content is replaced by the Score section, the Rating impact
          // block (Final phase only) explains why the viewer's Home level
          // card changed, and the organiser actions footer is the only place
          // on the page a destructive/editing action renders.
          <div className="space-y-6">
            <GameLineupSection
              sides={data.sides}
              viewerUserId={data.viewerUserId}
              isFinal={data.phase === "final"}
              winningGameTeamId={winningGameTeamId}
              canMintInvite={canMintInvite}
              onInvite={() => setInvitesOpen(true)}
              canMove={data.canMove}
              moving={moveSeat.isPending}
              onMove={(sideIndex, position) =>
                moveSeat.mutate({ gameId: id, sideIndex, position })
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
            {data.phase && data.phase !== "cancelled" && firstMatch ? (
              <FriendlyGameActionsFooter
                phase={data.phase}
                isOrganizer={data.isOrganizer}
                canLeaveGame={canLeaveGame}
                canReportWrongScore={data.canReportWrongScore}
                playerCount={occupiedFriendlyPositions(data.sides)}
                cancelGamePending={cancelGame.isPending}
                markAsNotPlayedPending={cancelMatch.isPending}
                reportWrongScorePending={reportWrongScore.isPending}
                leaveGamePending={leaveGame.isPending}
                onEditGame={() => setEditOpen(true)}
                onCancelGame={() => setCancelGameOpen(true)}
                onMarkAsNotPlayed={() => setMarkAsNotPlayedOpen(true)}
                onReportWrongScore={() => setReportWrongScoreOpen(true)}
                onLeaveGame={() => setLeaveGameOpen(true)}
              />
            ) : null}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="gap-4">
            <TabsList
              variant="segmented"
              className="sticky top-[var(--mobile-top-bar-height)] z-20 lg:top-0"
            >
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="space-y-6">
                {data.drawPostedAt && data.poolTables?.pools.length ? (
                  <TournamentPoolTablesPanel poolTables={data.poolTables} />
                ) : null}
                <GameOverviewPanel game={data} />
              </div>
            </TabsContent>
            <TabsContent value="players">
              <div className="space-y-6">
                <GamePlayersPanel
                  game={data}
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
          format={data.format}
          windowDay={windowDay}
          windowStartTime={windowStartTime}
          windowFinishTime={windowFinishTime}
          onDayChange={setWindowDay}
          onStartTimeChange={setWindowStartTime}
          onFinishTimeChange={setWindowFinishTime}
          windowError={updateWindow.error}
          windowPending={updateWindow.isPending}
          onSaveWindow={saveWindow}
          pricePerPlayer={pricePerPlayer}
          onPricePerPlayerChange={(value) => {
            setPricePerPlayer(value);
            setPricePerPlayerError(undefined);
          }}
          pricePerPlayerError={pricePerPlayerError}
          priceError={updatePricePerPlayer.error}
          priceSummaryRef={priceSummaryRef}
          pricePending={updatePricePerPlayer.isPending}
          onSavePrice={savePrice}
          levelMin={levelMin}
          onLevelMinChange={(value) => {
            setLevelMin(value);
            setLevelMinError(undefined);
          }}
          levelMax={levelMax}
          onLevelMaxChange={(value) => {
            setLevelMax(value);
            setLevelMaxError(undefined);
          }}
          levelMinError={levelMinError}
          levelMaxError={levelMaxError}
          levelError={updateLevelRange.error}
          levelSummaryRef={levelSummaryRef}
          levelPending={updateLevelRange.isPending}
          onSaveLevelRange={saveLevelRange}
          rounds={
            editRoundsPoolSizes
              ? {
                  poolSizes: editRoundsPoolSizes,
                  roundCount,
                  onRoundCountChange: setRoundCount,
                  overruns: editRoundsOverrun,
                  error: updateRoundCount.error,
                  summaryRef: roundsSummaryRef,
                  pending: updateRoundCount.isPending,
                  onSave: saveRounds,
                }
              : null
          }
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

      {canManageGameInvites ? (
        <GameInvitesDialog
          open={invitesOpen}
          onOpenChange={(next) => {
            setInvitesOpen(next);
            if (!next) {
              setLookupQuery("");
              setLookupRefused(null);
            }
          }}
          canSendLookup={canSendGameLookup}
          canCopyInviteLink
          inviteUrl={inviteLink.data?.shortUrl ?? inviteLink.data?.inviteUrl}
          sendPending={sendLookupInvite.isPending}
          copyPending={createInviteLink.isPending}
          sendError={sendLookupInvite.error}
          searchQuery={lookupQuery}
          onSearchQueryChange={setLookupQuery}
          searchResults={lookupSearch.data}
          searchPending={lookupSearch.isFetching}
          refused={lookupRefused}
          onSendLookup={(userIds) =>
            sendLookupInvite.mutate({ gameId: id, userIds })
          }
          onCopyInviteLink={() => createInviteLink.mutate({ gameId: id })}
        />
      ) : null}

      <ConfirmDialog
        open={cancelGameOpen}
        onOpenChange={setCancelGameOpen}
        title={`Cancel ${gameName}?`}
        description={
          usesFriendlyChrome
            ? cancelGameConsequence(occupiedFriendlyPositions(data.sides))
            : CANNOT_BE_UNDONE_COPY
        }
        confirmLabel={CANCEL_GAME_ACTION}
        pending={cancelGame.isPending}
        onConfirm={async () => {
          await cancelGame.mutateAsync({ gameId: id });
        }}
      />

      <ConfirmDialog
        open={markAsNotPlayedOpen}
        onOpenChange={setMarkAsNotPlayedOpen}
        title="Mark as not played?"
        description={MARK_AS_NOT_PLAYED_CONSEQUENCE}
        confirmLabel={MARK_AS_NOT_PLAYED_ACTION}
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
        title="Report a wrong score?"
        description={REPORT_WRONG_SCORE_CONSEQUENCE}
        confirmLabel={REPORT_WRONG_SCORE_ACTION}
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
        title={`Leave ${gameName}?`}
        description={tournamentLeaveOrKickConfirmCopy({
          partnerRequired: isPartnerRequiredGame(data),
          drawPosted: Boolean(data.drawPostedAt),
        })}
        confirmLabel={LEAVE_GAME_ACTION}
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
        title={kickConfirmCopy?.title ?? "Kick player?"}
        description={kickConfirmCopy?.description}
        confirmLabel={KICK_ACTION}
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
          toast.success(kickedToast(kickConfirm.name));
        }}
      />

      <ConfirmDialog
        open={completeMatchId != null}
        onOpenChange={(open) => {
          if (!open) {
            setCompleteMatchId(null);
          }
        }}
        title="Complete Match and update ratings?"
        description={COMPLETE_MATCH_CONSEQUENCE}
        confirmLabel={COMPLETE_MATCH_ACTION}
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
        title={`${LEAVE_WAITLIST_ACTION}?`}
        description={LEAVE_WAITLIST_CONSEQUENCE}
        confirmLabel={LEAVE_WAITLIST_ACTION}
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
            ? `Cancel ${gameName}?`
            : `${CANCEL_MATCH_ACTION}?`
        }
        description={CANNOT_BE_UNDONE_COPY}
        confirmLabel={
          data.format === "friendly_game"
            ? CANCEL_GAME_ACTION
            : CANCEL_MATCH_ACTION
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
