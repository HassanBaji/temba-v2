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
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";
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
import type { LookupUserSearchRow } from "~/server/invites/search-lookup-users";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  focusFormFailure,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { gameInviteClipboardText } from "~/lib/game-invite-share-message";
import {
  friendlyGameCanMintInvite,
  friendlyGameCtaFamily,
  friendlyGameOverflowItems,
  vacantJoinSeats,
} from "~/lib/friendly-game-cta";
import { friendlyGameHomeTitle } from "~/lib/friendly-game-chrome";
import { gameHomeTabFromQuery, gameHomeTabQuery } from "~/lib/game-home-tab";
import { gameViewerStatus, showsFriendlyRoster } from "~/lib/game-summary-cta";
import {
  formatGameWindowName,
  parseRequiredGameWindow,
  splitGameWindow,
} from "~/lib/game-window";
import { isNotFoundError } from "~/lib/is-not-found-error";
import {
  LEVEL_BAND_SELECT_NONE,
  LEVEL_RANGE_INVERTED_MESSAGE,
  parseLevelBandSelectTenths,
  tenthsToLevelBandSelectValue,
  type LevelBandSelectValue,
} from "~/lib/level-range";
import {
  centsToMajorInput,
  parseOptionalPricePerPlayerCents,
} from "~/lib/price-per-player";
import { api } from "~/trpc/react";

export default function GameHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = use(params);
  const query = use(searchParams);
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab = gameHomeTabFromQuery(tabParam);
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
  const menuTriggerRef = React.useRef<HTMLButtonElement>(null);
  const mobileMenuTriggerRef = React.useRef<HTMLButtonElement>(null);
  const inviteButtonRef = React.useRef<HTMLButtonElement>(null);
  const priceSummaryRef = React.useRef<HTMLDivElement>(null);
  const levelSummaryRef = React.useRef<HTMLDivElement>(null);
  const resultsSectionRef = React.useRef<HTMLDivElement>(null);

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
  const [lookupQuery, setLookupQuery] = React.useState("");
  const [lookupRefused, setLookupRefused] = React.useState<
    { name: string; message: string }[] | null
  >(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [invitesOpen, setInvitesOpen] = React.useState(false);
  const [cancelGameOpen, setCancelGameOpen] = React.useState(false);
  const [leaveGameOpen, setLeaveGameOpen] = React.useState(false);
  const [leaveWaitlistOpen, setLeaveWaitlistOpen] = React.useState(false);
  const [cancelMatchId, setCancelMatchId] = React.useState<string | null>(null);
  const [joinPickerOpen, setJoinPickerOpen] = React.useState(false);

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Seated");
      await utils.games.byId.invalidate({ id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const moveSeat = api.games.moveSeat.useMutation({
    onSuccess: async () => {
      toast.success("Moved");
      await utils.games.byId.invalidate({ id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Registered");
      setPartnerQuery("");
      setSelectedPartner([]);
      setPartnerSide("");
      setPartnerPosition("left");
      await utils.games.byId.invalidate({ id });
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
        result.waitlisted ? "Team joined waitlist" : "Team registered",
      );
      await utils.games.byId.invalidate({ id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const leaveGame = api.games.leave.useMutation({
    onSuccess: async () => {
      toast.success("Left Game");
      await utils.games.byId.invalidate({ id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const leaveWaitlist = api.games.leaveWaitlist.useMutation({
    onSuccess: async () => {
      toast.success("Left waitlist");
      await utils.games.byId.invalidate({ id });
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
      toast.success("Removed");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const closeRegistration = api.games.closeRegistration.useMutation({
    onSuccess: async () => {
      toast.success("Registration closed");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const reopenRegistration = api.games.reopenRegistration.useMutation({
    onSuccess: async () => {
      toast.success("Registration reopened");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const cancelGame = api.games.cancel.useMutation({
    onSuccess: async () => {
      toast.success("Game cancelled");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const cancelMatch = api.games.cancelMatch.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.cancelledGame ? "Game cancelled" : "Match cancelled",
      );
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const updateWindow = api.games.updateWindow.useMutation({
    onSuccess: async () => {
      toast.success("Window updated");
      setEditOpen(false);
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const updatePricePerPlayer = api.games.updatePricePerPlayer.useMutation({
    onSuccess: async () => {
      toast.success("Price per player saved");
      setEditOpen(false);
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(
        error,
        { pricePerPlayerCents: "edit-price-per-player" },
        priceSummaryRef.current,
      );
    },
  });

  const updateLevelRange = api.games.updateLevelRange.useMutation({
    onSuccess: async () => {
      toast.success("Level range saved");
      setEditOpen(false);
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
      await navigator.clipboard.writeText(
        gameInviteClipboardText({
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
        }),
      );
      toast.success("Invite link copied");
      await utils.games.getInviteLink.invalidate({ gameId: id });
    },
    onError: (error) => {
      toast.error(error.message);
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
  const usesFriendlyChrome = Boolean(
    data && showsFriendlyRoster(data.format, data.registrationMode),
  );
  const canMintInvite = data ? friendlyGameCanMintInvite(data) : false;
  const canManageGameInvites = usesFriendlyChrome
    ? canMintInvite
    : Boolean(data?.isOrganizer && !data.cancelledAt && !data.joinFrozen);
  const canSendGameLookup = Boolean(
    canManageGameInvites && data?.registrationMode !== "team_only",
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
    const gameWindow = splitGameWindow(data.windowStart, data.windowEnd);
    setWindowDay(gameWindow.day);
    setWindowStartTime(gameWindow.startTime);
    setWindowFinishTime(gameWindow.finishTime);
    setPricePerPlayer(centsToMajorInput(data.pricePerPlayerCents));
    setPricePerPlayerError(undefined);
    setLevelMin(tenthsToLevelBandSelectValue(data.levelMinTenths));
    setLevelMax(tenthsToLevelBandSelectValue(data.levelMaxTenths));
    setLevelMinError(undefined);
    setLevelMaxError(undefined);
  }, [data]);

  if (isNotFoundError(game.error)) {
    notFound();
  }

  if (game.isLoading) {
    return (
      <DashboardShell title="Game" hidePageHeader>
        <DetailPageSkeleton />
      </DashboardShell>
    );
  }

  if (game.error) {
    return (
      <DashboardShell title="Game" hidePageHeader>
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
      <DashboardShell title="Game" hidePageHeader>
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
    : gameName;
  const isOrganizerActive = data.isOrganizer && !data.cancelledAt;
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
        isSeated: data.isSeated,
        isRegistered: data.isRegistered,
        isWaitlisted: data.isWaitlisted,
        canLeave: data.canLeave,
      })
    : [];
  const headerActions = usesFriendlyChrome ? null : (
    <>
      {canManageGameInvites ? (
        <Button
          ref={inviteButtonRef}
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => setInvitesOpen(true)}
        >
          Invite
        </Button>
      ) : null}
      {primaryLeave ? (
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => setLeaveGameOpen(true)}
        >
          Leave Game
        </Button>
      ) : null}
      {primaryLeaveWaitlist ? (
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => setLeaveWaitlistOpen(true)}
        >
          Leave waitlist
        </Button>
      ) : null}
    </>
  );
  const overflowHandlers = {
    closePending: closeRegistration.isPending,
    reopenPending: reopenRegistration.isPending,
    onEdit: () => setEditOpen(true),
    onCloseRegistration: () => closeRegistration.mutate({ gameId: id }),
    onReopenRegistration: () => reopenRegistration.mutate({ gameId: id }),
    onInvite: () => setInvitesOpen(true),
    onShare: () => createInviteLink.mutate({ gameId: id }),
    onLeave: () => setLeaveGameOpen(true),
    onLeaveWaitlist: () => setLeaveWaitlistOpen(true),
    onCancelGame: () => setCancelGameOpen(true),
  };
  const mobileOverflow =
    usesFriendlyChrome && overflowItems.length > 0 ? (
      <FriendlyGameOverflowMenu
        items={overflowItems}
        triggerRef={mobileMenuTriggerRef}
        {...overflowHandlers}
      />
    ) : null;
  const desktopOverflow =
    usesFriendlyChrome && overflowItems.length > 0 ? (
      <FriendlyGameOverflowMenu
        items={overflowItems}
        triggerRef={menuTriggerRef}
        {...overflowHandlers}
      />
    ) : null;
  const organizerMenu = usesFriendlyChrome ? null : showMenu ? (
    <ActionMenu triggerRef={menuTriggerRef} label="Game actions">
      <ActionMenuItem onSelect={() => setEditOpen(true)}>
        Edit Game
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
      <ActionMenuSeparator />
      <ActionMenuItem
        variant="destructive"
        onSelect={() => setCancelGameOpen(true)}
      >
        Cancel Game
      </ActionMenuItem>
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
    const parsedPrice = parseOptionalPricePerPlayerCents(pricePerPlayer);
    if (!parsedPrice.ok) {
      setPricePerPlayerError(parsedPrice.message);
      document.getElementById("edit-price-per-player")?.focus();
      return;
    }
    updatePricePerPlayer.mutate({
      gameId: id,
      pricePerPlayerCents: parsedPrice.cents,
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

  return (
    <DashboardShell
      title={shellTitle}
      hidePageHeader
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
        {usesFriendlyChrome ? (
          <>
            {data.cancelledAt ? (
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
                pricePerPlayerCents={data.pricePerPlayerCents}
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
              onAddResult={() =>
                resultsSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              onInvite={
                ctaFamily.kind === "upcoming" && ctaFamily.showInvite
                  ? () => setInvitesOpen(true)
                  : undefined
              }
              onShareResult={
                ctaFamily.kind === "final"
                  ? () => {
                      void navigator.clipboard.writeText(
                        window.location.href,
                      );
                      toast.success("Link copied");
                    }
                  : undefined
              }
            />
          </div>
        ) : null}

        {data.joinFrozen && !data.cancelledAt ? (
          <SoftArchiveBanner heading="This Club Group's Community is Soft-archived">
            Registration, the waitlist, and invites stay closed.
          </SoftArchiveBanner>
        ) : null}

        {usesFriendlyChrome ? (
          // Hero + Line-up + Score + Rating impact scope (game-details
          // redesign, TEM-179/TEM-180/TEM-181/TEM-182): the tab bar and
          // Overview tab are gone for this Game format, the Players tab
          // content is replaced by the Line-up section, the Results tab
          // content is replaced by the Score section, and the Rating
          // impact block (Final phase only) explains why the viewer's Home
          // level card changed — no organiser/destructive actions inside
          // this scroll (that footer is TEM-184's scope, not built yet).
          <div className="space-y-6">
            <GameLineupSection
              sides={data.sides}
              viewerUserId={data.viewerUserId}
              isFinal={data.phase === "final"}
              winningGameTeamId={winningGameTeamId}
              canMintInvite={canMintInvite}
              onInvite={() => setInvitesOpen(true)}
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
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="gap-4">
            <TabsList
              // variant="line"
              className="sticky top-11 z-20 h-11 min-h-11 w-full max-w-full justify-between overflow-x-auto overflow-y-hidden lg:top-0"
            >
              <TabsTrigger value="overview" className="w-[33%]">
                Overview
              </TabsTrigger>
              <TabsTrigger value="players" className="w-[33%]">
                Players
              </TabsTrigger>
              <TabsTrigger value="results" className="w-[33%]">
                Results
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <GameOverviewPanel game={data} />
            </TabsContent>
            <TabsContent
              value="players"
              className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px]"
            >
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
                onKick={(userId) => kick.mutate({ gameId: id, userId })}
                onKickWaitlist={(waitlistId) =>
                  kick.mutate({ gameId: id, waitlistId })
                }
                onRegisterWithPartner={(input) =>
                  registerWithPartner.mutate({ gameId: id, ...input })
                }
                onRegisterTeam={(nextTeamId) =>
                  registerTeam.mutate({ gameId: id, teamId: nextTeamId })
                }
              />
            </TabsContent>
            <TabsContent
              value="results"
              className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px]"
            >
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
                onComplete={(matchId) =>
                  completeMatch.mutate({ gameId: id, matchId })
                }
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
          restoreFocusRef={menuTriggerRef}
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
        />
      ) : null}

      {usesFriendlyChrome ? (
        <FriendlyGameJoinSheet
          open={joinPickerOpen}
          onOpenChange={setJoinPickerOpen}
          title={gameName}
          sides={data.sides}
          pending={registerSeat.isPending}
          onPickSeat={(sideIndex, position) =>
            registerSeat.mutate({ gameId: id, sideIndex, position })
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
          restoreFocusRef={inviteButtonRef}
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
        description="This cannot be undone."
        confirmLabel="Cancel Game"
        pending={cancelGame.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await cancelGame.mutateAsync({ gameId: id });
        }}
      />

      <ConfirmDialog
        open={leaveGameOpen}
        onOpenChange={setLeaveGameOpen}
        title={`Leave ${gameName}?`}
        description="Your spot can open for someone else."
        confirmLabel="Leave Game"
        pending={leaveGame.isPending}
        onConfirm={async () => {
          await leaveGame.mutateAsync({ gameId: id });
        }}
      />

      <ConfirmDialog
        open={leaveWaitlistOpen}
        onOpenChange={setLeaveWaitlistOpen}
        title="Leave waitlist?"
        description="You'll lose your place on the Waitlist."
        confirmLabel="Leave waitlist"
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
            ? "Cancel Match (cancels Game)?"
            : "Cancel Match?"
        }
        description={
          data.format === "friendly_game"
            ? "Cancelling this Match also cancels the Game. This cannot be undone."
            : "This cannot be undone."
        }
        confirmLabel={
          data.format === "friendly_game"
            ? "Cancel Match (cancels Game)"
            : "Cancel Match"
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
    </DashboardShell>
  );
}
