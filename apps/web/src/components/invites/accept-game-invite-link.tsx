"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { FootballJoinDialog } from "~/components/games/football-join-dialog";
import { GameSeatGrid } from "~/components/games/game-seat-grid";
import {
  GameLinkGroupJoined,
  GameLinkGroupLanding,
  GameLinkGroupRequested,
} from "~/components/invites/game-link-group";
import { InviteAuthButtons } from "~/components/invites/invite-auth-buttons";
import {
  InviteOutcome,
  InvitePreviewError,
} from "~/components/invites/invite-outcome";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { footballInviteJoinSubtitle } from "@repo/domain/football-board";
import {
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import { groupDisplayName } from "@repo/domain/group-join";
import {
  gameInviteGroupGate,
  gameInviteSeatCopy,
  gameInviteLinkStage,
  gameInviteSeatState,
  inviteLinkAcceptToast,
  levelRangeGateAction,
  type GameInviteGroupChoice,
} from "@repo/domain/invites";
import {
  formatLevelRangeGateCopy,
  formatLevelRangeLabel,
} from "@repo/domain/level-range";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { tournamentPartnerInviteLandingHref } from "@repo/domain/tournament-join";
import { api } from "~/trpc/react";

export function AcceptGameInviteLink({
  token,
  isSignedIn,
  returnPath,
}: {
  token: string;
  isSignedIn: boolean;
  returnPath: string;
}) {
  const router = useRouter();
  const m = useMessages();
  const locale = useLocale();
  const [footballOpen, setFootballOpen] = React.useState(true);
  const [groupDialogOpen, setGroupDialogOpen] = React.useState(false);
  const [groupDecided, setGroupDecided] = React.useState(false);
  const [holdSeat, setHoldSeat] = React.useState(false);
  const [justJoinedGroup, setJustJoinedGroup] = React.useState(false);
  const preview = api.games.previewInviteLink.useQuery({ token });
  const requestLevelRange = api.games.requestLevelRange.useMutation({
    onSuccess: async () => {
      toast.success(m.webAuth.invites.requestSent);
      await preview.refetch();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
  const accept = api.games.acceptInviteLink.useMutation({
    onSuccess: (result) => {
      toast.success(
        inviteLinkAcceptToast(
          "game",
          locale,
          result.outcome,
          result.joinedGroup,
        ),
      );
      if (result.outcome === "waiting_for_partner") {
        return;
      }
      router.replace(`/dashboard/games/${result.gameId}`);
    },
    onError: (error, variables) => {
      if (!variables.football) {
        toast.error(error.message);
      }
      void preview.refetch();
    },
  });

  const ready = preview.data?.status === "ready" ? preview.data : undefined;
  const stage = ready ? gameInviteLinkStage(ready, isSignedIn) : "accept";
  const group = ready?.group ?? null;
  const groupGate = gameInviteGroupGate(group);
  const groupName = group ? groupDisplayName(group.name, locale) : null;
  const joinGroup = api.games.joinGroupFromInviteLink.useMutation({
    onSuccess: async (result) => {
      setGroupDialogOpen(false);
      setGroupDecided(false);
      setHoldSeat(false);
      if (result.outcome === "joined") {
        toast.success(
          m.mobileInvite.link.group.joinedToast(groupName ?? m.group.untitled),
        );
        setJustJoinedGroup(true);
      } else if (result.outcome === "requested") {
        toast.success(m.mobileInvite.link.group.requestedToast);
      }
      await preview.refetch();
    },
    onError: (error, variables) => {
      if (!variables.football) {
        toast.error(error.message);
      }
      void preview.refetch();
    },
  });
  const withdraw = api.groups.withdrawJoinRequest.useMutation({
    onSuccess: async () => {
      toast.success(m.mobileInvite.link.group.withdrawnToast);
      await preview.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  // The Group question stands between a signed-in non-member and the seat
  // on every join stage; Level range and partner stages keep their own gate.
  const groupStage =
    stage === "seat_pick" || stage === "football" || stage === "accept";
  const groupAsks =
    isSignedIn && group != null && groupStage && groupGate !== "none";
  const groupBlocks = groupAsks && (groupGate === "requested" || !groupDecided);
  const openSeats = ready?.football
    ? Math.max(
        0,
        (ready.football.playersAllowed ?? 0) - ready.football.players.length,
      )
    : (ready?.vacantSeats.length ?? 0);
  const blockedByLevelRange = stage === "level_range";
  const partnerRequiredJoin = stage === "partner";
  const needsSeatPick = stage === "seat_pick";
  const footballJoin = stage === "football";
  const football = ready?.football ?? null;
  const sides = ready?.sides ?? [];
  const vacantSeats = ready?.vacantSeats ?? [];
  const seatState = gameInviteSeatState({
    registrationStatus: ready?.registrationStatus ?? "open",
    vacantSeatCount: vacantSeats.length,
  });
  const joinFrozen = seatState.joinFrozen;
  const waitlistOnly = needsSeatPick && seatState.waitlistOnly;
  const canJoinVacant = isSignedIn && !joinFrozen && !waitlistOnly;
  const seatRaceError =
    needsSeatPick && accept.isError && accept.error.data?.code === "CONFLICT";
  const footballJoinError = footballJoin && accept.isError;
  const sideNoun = "Team";
  const rangeLabel = formatLevelRangeLabel(
    ready?.levelMinTenths,
    ready?.levelMaxTenths,
    locale,
  );
  const levelAction = levelRangeGateAction({
    requestStatus: ready?.levelRangeRequest?.status ?? null,
    canRequest: ready?.canRequestLevelRange ?? false,
    requesting: requestLevelRange.isPending,
    locale,
  });
  const gameName = ready
    ? gameDisplayName(ready.game, locale)
    : m.invite.kind.game;

  React.useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    if (preview.data?.status !== "ready") {
      return;
    }
    if (preview.data.viewerPassesLevelRange === false) {
      return;
    }
    if (accept.isPending || accept.isSuccess || accept.isError) {
      return;
    }
    if (
      preview.data.partnerRequiredJoin ||
      preview.data.needsSeatPick ||
      preview.data.football
    ) {
      return;
    }
    if (groupBlocks || holdSeat) {
      return;
    }
    accept.mutate({ token });
  }, [accept, groupBlocks, holdSeat, isSignedIn, preview.data, token]);

  const joinPending = accept.isPending || joinGroup.isPending;

  function onJoinSeat(sideIndex: number, position: "left" | "right") {
    if (joinPending) {
      return;
    }
    if (holdSeat) {
      joinGroup.mutate({ token, holdSeat: true, sideIndex, position });
      return;
    }
    accept.mutate({
      token,
      sideIndex,
      position,
    });
  }

  function onJoinFootball(role: FootballRole, position: FootballPosition) {
    if (joinPending) {
      return;
    }
    if (holdSeat) {
      joinGroup.mutate({ token, holdSeat: true, football: { role, position } });
      return;
    }
    accept.mutate({ token, football: { role, position } });
  }

  function onJoinWaitlist() {
    if (joinPending) {
      return;
    }
    if (holdSeat) {
      joinGroup.mutate({ token, holdSeat: true });
      return;
    }
    accept.mutate({ token });
  }

  function onChooseGroup(choice: GameInviteGroupChoice) {
    if (joinPending) {
      return;
    }
    if (choice === "group_only") {
      joinGroup.mutate({ token });
      return;
    }
    const hold = groupGate === "approval";
    setGroupDialogOpen(false);
    setGroupDecided(true);
    setHoldSeat(hold);
    setFootballOpen(true);
    // Without a hold, the auto-join effect takes the seat once the gate lifts.
    if (stage === "accept" && hold) {
      joinGroup.mutate({ token, holdSeat: true });
    }
  }

  const groupChoicePending: GameInviteGroupChoice | null = joinGroup.isPending
    ? joinGroup.variables?.holdSeat
      ? "with_seat"
      : "group_only"
    : null;
  const joinedNotice =
    group && justJoinedGroup ? (
      <GameLinkGroupJoined
        group={group}
        openSeats={openSeats}
        groupHref={`/dashboard/groups/${group.id}`}
      />
    ) : null;

  if (preview.isLoading || (preview.isError && preview.isFetching)) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (preview.isError) {
    return <InvitePreviewError onRetry={() => void preview.refetch()} />;
  }

  if (
    preview.data?.status === "invalid" ||
    preview.data?.status === "unavailable"
  ) {
    return (
      <InviteOutcome
        outcome={preview.data.status}
        hostLabel="Game"
        isSignedIn={isSignedIn}
      />
    );
  }

  if (accept.data?.outcome === "waiting_for_partner") {
    return (
      <InviteOutcome
        outcome="waiting_for_partner"
        hostLabel="Game"
        isSignedIn={isSignedIn}
      />
    );
  }

  if (accept.isError && !seatRaceError && !footballJoinError) {
    return (
      <ErrorState
        title={m.webAuth.invites.couldNotJoin}
        message={accept.error.message}
        onRetry={() => accept.mutate(accept.variables ?? { token })}
        headingLevel={1}
      />
    );
  }

  if (blockedByLevelRange && ready && !accept.isSuccess) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-title font-semibold">
            {m.invite.link.joinLabel(gameName)}
          </h1>
          {rangeLabel ? (
            <p className="text-body text-muted-foreground">{rangeLabel}</p>
          ) : null}
          <p className="text-body text-muted-foreground">
            {formatLevelRangeGateCopy({
              levelMinTenths: ready.levelMinTenths,
              levelMaxTenths: ready.levelMaxTenths,
              viewerLevelTenths: ready.viewerLevelTenths,
              locale,
            })}
          </p>
        </div>
        {levelAction.kind === "pending-note" ? (
          <p className="text-body text-muted-foreground">{levelAction.text}</p>
        ) : (
          <Button
            className="min-h-11"
            disabled={levelAction.disabled}
            onClick={() =>
              requestLevelRange.mutate({
                gameId: ready.gameId,
                inviteToken: token,
              })
            }
          >
            {levelAction.label}
          </Button>
        )}
      </div>
    );
  }

  if (partnerRequiredJoin && ready && !accept.isSuccess) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-title font-semibold">
            {m.invite.link.joinLabel(gameName)}
          </h1>
          {rangeLabel ? (
            <p className="text-body text-muted-foreground">{rangeLabel}</p>
          ) : null}
          <p className="text-body text-muted-foreground">
            {m.tournament.join.partnerInviteLanding}
          </p>
        </div>
        {isSignedIn ? (
          <Button className="min-h-11" asChild>
            <Link href={tournamentPartnerInviteLandingHref(ready.gameId)}>
              {m.tournament.join.pickAPartner}
            </Link>
          </Button>
        ) : (
          <InviteAuthButtons
            returnPath={returnPath}
            className="flex flex-wrap gap-2"
          />
        )}
      </div>
    );
  }

  if (group && groupAsks && groupGate === "requested") {
    return (
      <GameLinkGroupRequested
        group={group}
        gameName={gameName}
        rangeLabel={rangeLabel}
        withdrawPending={withdraw.isPending}
        onWithdraw={(requestId) => withdraw.mutate({ requestId })}
      />
    );
  }

  if (group && groupBlocks) {
    return (
      <GameLinkGroupLanding
        group={group}
        gameName={gameName}
        rangeLabel={rangeLabel}
        openSeats={openSeats}
        pending={groupChoicePending}
        dialogOpen={groupDialogOpen}
        onDialogOpenChange={setGroupDialogOpen}
        onChoose={onChooseGroup}
      />
    );
  }

  if (needsSeatPick && !accept.isSuccess) {
    return (
      <div className="space-y-4">
        {joinedNotice}
        <div className="space-y-2">
          <h1 className="text-title font-semibold">
            {m.invite.link.joinLabel(gameName)}
          </h1>
          {rangeLabel ? (
            <p className="text-body text-muted-foreground">{rangeLabel}</p>
          ) : null}
          <p className="text-body text-muted-foreground">
            {gameInviteSeatCopy(
              { joinFrozen, waitlistOnly },
              isSignedIn ? "link" : "link-signed-out",
              locale,
            )}
          </p>
        </div>
        <GameSeatGrid
          sides={sides}
          canJoinVacant={canJoinVacant}
          joinLabel={m.invite.inbox.sitHereLabel}
          joining={joinPending}
          canMove={false}
          moving={false}
          isOrganizer={false}
          cancelled={joinFrozen}
          kickPending={false}
          onJoin={onJoinSeat}
          onMove={() => undefined}
          onKick={() => undefined}
          sideNoun={sideNoun}
        />
        {isSignedIn ? (
          waitlistOnly ? (
            <Button
              className="min-h-11"
              onClick={onJoinWaitlist}
              disabled={joinPending}
            >
              {joinPending
                ? m.webAuth.invites.joiningShort
                : m.invite.inbox.joinWaitlistLabel}
            </Button>
          ) : null
        ) : (
          <InviteAuthButtons
            returnPath={returnPath}
            className="flex flex-wrap gap-2"
          />
        )}
      </div>
    );
  }

  if (footballJoin && football && !accept.isSuccess) {
    const subtitle = footballInviteJoinSubtitle(football, locale);
    return (
      <div className="space-y-4">
        {joinedNotice}
        <div className="space-y-2">
          <h1 className="text-title font-semibold">
            {m.invite.link.joinLabel(gameName)}
          </h1>
          <p className="text-body text-muted-foreground">{subtitle}</p>
          <p className="text-body text-muted-foreground">
            {m.webAuth.invites.football.pickRole}
          </p>
        </div>
        <Button className="min-h-11" onClick={() => setFootballOpen(true)}>
          {m.webAuth.invites.football.chooseHowYouPlay}
        </Button>
        <FootballJoinDialog
          open={footballOpen}
          onOpenChange={setFootballOpen}
          mode="join"
          subtitle={subtitle}
          players={football.players}
          viewer={football.preferred}
          price={formatPricePerPlayerFils(football.pricePerPlayerFils, locale)}
          teamsLine={
            football.teamsSet
              ? m.webAuth.invites.football.teamsSet
              : m.webAuth.invites.football.teamsByOrganizer
          }
          pending={joinPending}
          error={accept.error?.message ?? joinGroup.error?.message ?? null}
          onSubmit={onJoinFootball}
        />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-title font-semibold">
            {m.invite.link.joinLabel(gameName)}
          </h1>
          {rangeLabel ? (
            <p className="text-body text-muted-foreground">{rangeLabel}</p>
          ) : null}
          <p className="text-body text-muted-foreground">
            {m.webAuth.invites.signInToJoin(gameName)}
          </p>
        </div>
        <InviteAuthButtons
          returnPath={returnPath}
          className="flex flex-wrap gap-2"
        />
      </div>
    );
  }

  return (
    <div aria-busy="true" className="space-y-3">
      {joinedNotice}
      <h1 className="text-title font-semibold">
        {m.webAuth.invites.joining(gameName)}
      </h1>
      {rangeLabel ? (
        <p className="text-body text-muted-foreground">{rangeLabel}</p>
      ) : null}
    </div>
  );
}
