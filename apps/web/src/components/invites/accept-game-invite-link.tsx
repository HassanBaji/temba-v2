"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { GameSeatGrid } from "~/components/games/game-seat-grid";
import { InviteAuthButtons } from "~/components/invites/invite-auth-buttons";
import {
  InviteOutcome,
  InvitePreviewError,
} from "~/components/invites/invite-outcome";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  gameInviteSeatCopy,
  gameInviteLinkStage,
  gameInviteSeatState,
  INVITE_JOIN_WAITLIST_LABEL,
  INVITE_SIT_HERE_LABEL,
  inviteLinkAcceptToast,
  levelRangeGateAction,
} from "@repo/domain/invites";
import {
  formatLevelRangeGateCopy,
  formatLevelRangeLabel,
} from "@repo/domain/level-range";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import {
  PARTNER_REQUIRED_INVITE_LANDING_COPY,
  PARTNER_REQUIRED_INVITE_LANDING_CTA,
  tournamentPartnerInviteLandingHref,
} from "@repo/domain/tournament-join";
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
  const preview = api.games.previewInviteLink.useQuery({ token });
  const requestLevelRange = api.games.requestLevelRange.useMutation({
    onSuccess: async () => {
      toast.success("Request sent");
      await preview.refetch();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
  const accept = api.games.acceptInviteLink.useMutation({
    onSuccess: (result) => {
      toast.success(inviteLinkAcceptToast("game", result.outcome));
      if (result.outcome === "waiting_for_partner") {
        return;
      }
      router.replace(`/dashboard/games/${result.gameId}`);
    },
    onError: (error) => {
      toast.error(error.message);
      void preview.refetch();
    },
  });

  const ready = preview.data?.status === "ready" ? preview.data : undefined;
  const stage = ready ? gameInviteLinkStage(ready, isSignedIn) : "accept";
  const blockedByLevelRange = stage === "level_range";
  const partnerRequiredJoin = stage === "partner";
  const needsSeatPick = stage === "seat_pick";
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
  const sideNoun = "Team";
  const rangeLabel = formatLevelRangeLabel(
    ready?.levelMinTenths,
    ready?.levelMaxTenths,
  );
  const levelAction = levelRangeGateAction({
    requestStatus: ready?.levelRangeRequest?.status ?? null,
    canRequest: ready?.canRequestLevelRange ?? false,
    requesting: requestLevelRange.isPending,
  });

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
    if (preview.data.partnerRequiredJoin || preview.data.needsSeatPick) {
      return;
    }
    accept.mutate({ token });
  }, [accept, isSignedIn, preview.data, token]);

  function onJoinSeat(sideIndex: number, position: "left" | "right") {
    if (accept.isPending) {
      return;
    }
    accept.mutate({
      token,
      sideIndex,
      position,
    });
  }

  function onJoinWaitlist() {
    if (accept.isPending) {
      return;
    }
    accept.mutate({ token });
  }

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

  if (accept.isError && !seatRaceError) {
    return (
      <ErrorState
        title="Could not join"
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
            Join {ready.gameName ?? "Game"}
          </h1>
          {rangeLabel ? (
            <p className="text-body text-muted-foreground">{rangeLabel}</p>
          ) : null}
          <p className="text-body text-muted-foreground">
            {formatLevelRangeGateCopy({
              levelMinTenths: ready.levelMinTenths,
              levelMaxTenths: ready.levelMaxTenths,
              viewerLevelTenths: ready.viewerLevelTenths,
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
            Join {ready.gameName ?? "Game"}
          </h1>
          {rangeLabel ? (
            <p className="text-body text-muted-foreground">{rangeLabel}</p>
          ) : null}
          <p className="text-body text-muted-foreground">
            {PARTNER_REQUIRED_INVITE_LANDING_COPY}
          </p>
        </div>
        {isSignedIn ? (
          <Button className="min-h-11" asChild>
            <Link href={tournamentPartnerInviteLandingHref(ready.gameId)}>
              {PARTNER_REQUIRED_INVITE_LANDING_CTA}
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

  if (needsSeatPick && !accept.isSuccess) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-title font-semibold">
            Join {ready?.gameName ?? "Game"}
          </h1>
          {rangeLabel ? (
            <p className="text-body text-muted-foreground">{rangeLabel}</p>
          ) : null}
          <p className="text-body text-muted-foreground">
            {gameInviteSeatCopy(
              { joinFrozen, waitlistOnly },
              isSignedIn ? "link" : "link-signed-out",
            )}
          </p>
        </div>
        <GameSeatGrid
          sides={sides}
          canJoinVacant={canJoinVacant}
          joinLabel={INVITE_SIT_HERE_LABEL}
          joining={accept.isPending}
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
              disabled={accept.isPending}
            >
              {accept.isPending ? "Joining…" : INVITE_JOIN_WAITLIST_LABEL}
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

  if (!isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-title font-semibold">
            Join {ready?.gameName ?? "Game"}
          </h1>
          {rangeLabel ? (
            <p className="text-body text-muted-foreground">{rangeLabel}</p>
          ) : null}
          <p className="text-body text-muted-foreground">
            Sign in or create an account to join {ready?.gameName ?? "Game"}.
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
      <h1 className="text-title font-semibold">
        Joining {ready?.gameName ?? "Game"}…
      </h1>
      {rangeLabel ? (
        <p className="text-body text-muted-foreground">{rangeLabel}</p>
      ) : null}
    </div>
  );
}
