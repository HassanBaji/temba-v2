"use client";

import { notFound } from "next/navigation";
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
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameEditDialog } from "~/components/games/game-edit-dialog";
import { GameHomeHeader } from "~/components/games/game-home-header";
import { GameOverviewPanel } from "~/components/games/game-overview-panel";
import { GamePlayersPanel } from "~/components/games/game-players-panel";
import { GameResultsPanel } from "~/components/games/game-results-panel";
import { InviteLinkPanel } from "~/components/invites/invite-link-panel";
import { LookupInvitePanel } from "~/components/invites/lookup-invite-panel";
import { type LookupUserOption } from "~/components/invites/lookup-user-select";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { isNotFoundError } from "~/lib/is-not-found-error";
import {
  focusFormFailure,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import {
  formatGameWindowName,
  parseRequiredGameWindow,
  splitGameWindow,
} from "~/lib/game-window";
import {
  centsToMajorInput,
  parseOptionalPricePerPlayerCents,
} from "~/lib/price-per-player";
import { api } from "~/trpc/react";

export default function GameHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const utils = api.useUtils();
  const game = api.games.byId.useQuery({ id });
  const menuTriggerRef = React.useRef<HTMLButtonElement>(null);
  const priceSummaryRef = React.useRef<HTMLDivElement>(null);

  const [partnerQuery, setPartnerQuery] = React.useState("");
  const [selectedPartner, setSelectedPartner] = React.useState<
    LookupUserOption[]
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
  const [lookupQuery, setLookupQuery] = React.useState("");
  const [lookupRefused, setLookupRefused] = React.useState<
    { name: string; message: string }[] | null
  >(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [lookupOpen, setLookupOpen] = React.useState(false);
  const [inviteLinkOpen, setInviteLinkOpen] = React.useState(false);
  const [cancelGameOpen, setCancelGameOpen] = React.useState(false);
  const [leaveGameOpen, setLeaveGameOpen] = React.useState(false);
  const [leaveWaitlistOpen, setLeaveWaitlistOpen] = React.useState(false);
  const [cancelMatchId, setCancelMatchId] = React.useState<string | null>(null);

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
    await utils.games.listMyGroups.invalidate();
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

  const revokeLookupInvite = api.games.revokeLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite revoked");
      await utils.games.listLookupInvites.invalidate({ gameId: id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const createInviteLink = api.games.createInviteLink.useMutation({
    onSuccess: async (result) => {
      await navigator.clipboard.writeText(result.inviteUrl);
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
  const canManageLookup = Boolean(
    data?.isOrganizer &&
      data.registrationMode !== "team_only" &&
      !data.cancelledAt,
  );
  const canSendGameLookup = Boolean(canManageLookup && !data?.joinFrozen);
  const lookupInvites = api.games.listLookupInvites.useQuery(
    { gameId: id },
    { enabled: canManageLookup },
  );
  const lookupSearch = api.games.searchLookupUsers.useQuery(
    { gameId: id, query: lookupQuery },
    { enabled: lookupOpen && canSendGameLookup },
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
  const canManageInviteLink = Boolean(
    data?.isOrganizer && !data.cancelledAt && !data.joinFrozen,
  );
  const inviteLink = api.games.getInviteLink.useQuery(
    { gameId: id },
    { enabled: canManageInviteLink },
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
  const isOrganizerActive = data.isOrganizer && !data.cancelledAt;
  const showMenu = isOrganizerActive;
  const primaryLeave = data.isRegistered && data.canLeave && !data.isWaitlisted;
  const primaryLeaveWaitlist = data.isWaitlisted;

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

  return (
    <DashboardShell title={gameName} hidePageHeader>
      <div className="space-y-6">
        <GameHomeHeader
          name={gameName}
          groupId={data.groupId}
          groupName={data.groupName}
          sport={data.sport}
          isPublic={data.isPublic}
          registrationMode={data.registrationMode}
          registrationStatus={data.registrationStatus}
          primaryAction={
            <>
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
          }
          actions={
            showMenu ? (
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
                {canManageLookup ? (
                  <ActionMenuItem onSelect={() => setLookupOpen(true)}>
                    Lookup invite
                  </ActionMenuItem>
                ) : null}
                {canManageInviteLink ? (
                  <ActionMenuItem onSelect={() => setInviteLinkOpen(true)}>
                    Invite link
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
            ) : null
          }
        />

        {data.joinFrozen && !data.cancelledAt ? (
          <SoftArchiveBanner heading="This Club Group's Community is Soft-archived">
            Register, waitlist, Lookup, and Invite link mint and accept stay
            closed. Reopen is refused.
          </SoftArchiveBanner>
        ) : null}

        <Tabs defaultValue="overview" className="gap-4">
          <TabsList
            variant="line"
            className="bg-background sticky top-11 z-20 h-11 min-h-11 w-full max-w-full justify-start overflow-x-auto overflow-y-hidden rounded-none lg:top-0"
          >
            <TabsTrigger
              value="overview"
              className="min-h-11 min-w-11 flex-none px-3"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="players"
              className="min-h-11 min-w-11 flex-none px-3"
            >
              Players
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="min-h-11 min-w-11 flex-none px-3"
            >
              Results
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="overview"
            className="focus-visible:ring-ring/50 rounded-md focus-visible:ring-[3px]"
          >
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
        />
      ) : null}

      {canManageLookup ? (
        <ResponsiveDialog
          open={lookupOpen}
          onOpenChange={(next) => {
            setLookupOpen(next);
            if (!next) {
              setLookupQuery("");
              setLookupRefused(null);
            }
          }}
        >
          <ResponsiveDialogContent restoreFocusRef={menuTriggerRef}>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Lookup invite</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {data.joinFrozen
                  ? "Lookup invite is paused while the Community is Soft-archived."
                  : "Search existing Users and send Lookup invites. The invitee accepts on Invites. Team-only Games do not offer Lookup."}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="space-y-8 px-4 pb-4 md:px-0 md:pb-0">
              <LookupInvitePanel
                description={
                  data.joinFrozen
                    ? "Lookup invite is paused while the Community is Soft-archived."
                    : "Organizers can search existing Users and send Lookup invites. The invitee accepts on Invites. Team-only Games do not offer Lookup."
                }
                lookupInvites={lookupInvites.data}
                sendPending={sendLookupInvite.isPending}
                revokePending={revokeLookupInvite.isPending}
                sendError={sendLookupInvite.error}
                searchQuery={lookupQuery}
                onSearchQueryChange={setLookupQuery}
                searchResults={lookupSearch.data}
                searchPending={lookupSearch.isFetching}
                refused={lookupRefused}
                canSend={canSendGameLookup}
                onSendUserIds={(userIds) =>
                  sendLookupInvite.mutate({ gameId: id, userIds })
                }
                onRevokeLookup={(inviteId) =>
                  revokeLookupInvite.mutate({ inviteId })
                }
              />
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      ) : null}

      {canManageInviteLink ? (
        <ResponsiveDialog
          open={inviteLinkOpen}
          onOpenChange={setInviteLinkOpen}
        >
          <ResponsiveDialogContent restoreFocusRef={menuTriggerRef}>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Invite link</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Copy a Game Invite link.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="space-y-8 px-4 pb-4 md:px-0 md:pb-0">
              <InviteLinkPanel
                inviteUrl={inviteLink.data?.inviteUrl}
                copyPending={createInviteLink.isPending}
                onCopy={() => createInviteLink.mutate({ gameId: id })}
              />
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      ) : null}

      <ConfirmDialog
        open={cancelGameOpen}
        onOpenChange={setCancelGameOpen}
        title={`Cancel ${gameName}?`}
        description="This cannot be undone. Cancelling does nothing."
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
        description="You will leave this Game. Cancelling does nothing."
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
        description="You will leave the waitlist for this Game. Cancelling does nothing."
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
            : "This cannot be undone. Cancelling does nothing."
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
