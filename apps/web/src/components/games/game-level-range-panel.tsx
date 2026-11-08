"use client";

import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  levelRangeQueueVisible,
  levelRangeRequestCard,
  levelRangeRequestRowMeta,
} from "@repo/domain/level-range-request";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import { tenthsToLevelBand } from "@repo/domain/level-range";
import {
  requestsQueueHeading,
  seatHoldRemainingLabel,
  seatHoldRequestDetail,
  seatHoldRequestRowMeta,
} from "@repo/domain/seat-hold-request";
import { useLocale, useMessages } from "~/components/locale-provider";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import type { TournamentDetails } from "@repo/domain/tournament-details";

/** The Game fields the player's Level card and the Organizer's Requests queue read. */
type GameDetail = Pick<
  TournamentDetails,
  | "id"
  | "isOrganizer"
  | "levelMinTenths"
  | "levelMaxTenths"
  | "viewerLevelTenths"
  | "canRequestLevelRange"
  | "levelRangeRequest"
  | "pendingLevelRangeRequests"
  | "pendingSeatHolds"
>;

/** Design "Join via link" 2a: who asks, what for, and the decision on the row. */
function GameRequestRow({
  name,
  image,
  levelTenths,
  detail,
  held,
  meta,
  approvePending,
  rejectPending,
  onApprove,
  onReject,
}: {
  name: string;
  image: string | null;
  levelTenths: number | null;
  detail: string;
  held: string | null;
  meta: string;
  approvePending: boolean;
  rejectPending: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const m = useMessages();
  const copy = m.webAuth.invites.request;
  const [confirmRejectOpen, setConfirmRejectOpen] = React.useState(false);
  const busy = approvePending || rejectPending;
  const level =
    levelTenths == null
      ? null
      : displayLabelFromStoredBand(tenthsToLevelBand(levelTenths));
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start gap-3">
        <EntityMonogram name={name} image={image} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-body truncate font-semibold">{name}</span>
            {level ? (
              <span className="text-body font-bold [font-variation-settings:'wdth'_118,'wght'_700]">
                {level}
              </span>
            ) : null}
          </p>
          <p className="text-meta text-muted-foreground" title={meta}>
            {detail}
          </p>
        </div>
        {held ? (
          <span className="text-meta text-muted-foreground shrink-0">
            {held}
          </span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          className="min-h-11 flex-1"
          disabled={busy}
          pending={approvePending}
          pendingLabel={copy.approving}
          aria-label={copy.approve(name)}
          onClick={onApprove}
        >
          {copy.approveLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={busy}
          pending={rejectPending}
          pendingLabel={copy.rejecting}
          aria-label={copy.reject(name)}
          onClick={() => setConfirmRejectOpen(true)}
        >
          {m.game.requests.decline}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmRejectOpen}
        onOpenChange={setConfirmRejectOpen}
        title={copy.rejectConfirm(name)}
        description={copy.canAskAgain}
        confirmLabel={m.game.requests.decline}
        pending={rejectPending}
        onConfirm={onReject}
      />
    </div>
  );
}

export function GameLevelRangePanel({ game }: { game: GameDetail }) {
  const locale = useLocale();
  const m = useMessages();
  const utils = api.useUtils();
  const requestLevelRange = api.games.requestLevelRange.useMutation({
    onSuccess: async () => {
      toast.success(m.level.request.sent);
      await utils.games.byId.invalidate({ id: game.id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
  const approve = api.games.approveLevelRangeRequest.useMutation({
    onSuccess: async () => {
      toast.success(m.webGame.levelRange.requestApproved);
      await utils.games.byId.invalidate({ id: game.id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
  const reject = api.games.rejectLevelRangeRequest.useMutation({
    onSuccess: async () => {
      toast.success(m.webGame.levelRange.requestRejected);
      await utils.games.byId.invalidate({ id: game.id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
  const approveSeatHold = api.groups.approveJoinRequest.useMutation({
    onSuccess: async () => {
      toast.success(m.webGame.levelRange.requestApproved);
      await utils.games.byId.invalidate({ id: game.id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
  const rejectSeatHold = api.groups.rejectJoinRequest.useMutation({
    onSuccess: async () => {
      toast.success(m.webGame.levelRange.requestRejected);
      await utils.games.byId.invalidate({ id: game.id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const requestCard = levelRangeRequestCard(game, locale);
  const seatHolds = game.pendingSeatHolds ?? [];
  const showOrganizerQueue =
    levelRangeQueueVisible(game) || seatHolds.length > 0;
  const queueHeading = requestsQueueHeading(
    {
      levelRange: game.pendingLevelRangeRequests.length,
      seatHolds: seatHolds.length,
    },
    locale,
  );

  if (!requestCard && !showOrganizerQueue) {
    return null;
  }

  return (
    <div className="space-y-6">
      {requestCard ? (
        <Card variant="outlined" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-title font-medium">{requestCard.title}</h3>
            {requestCard.badge === "Pending" ? (
              <Badge variant="warning">{m.level.request.pending}</Badge>
            ) : null}
            {requestCard.badge === "Rejected" ? (
              <Badge variant="destructive">{m.level.request.rejected}</Badge>
            ) : null}
          </div>
          <p className="text-body text-muted-foreground">{requestCard.copy}</p>
          {requestCard.actionLabel ? (
            <Button
              type="button"
              disabled={
                requestLevelRange.isPending || !requestCard.actionEnabled
              }
              onClick={() => requestLevelRange.mutate({ gameId: game.id })}
            >
              {requestLevelRange.isPending
                ? m.webGame.levelRange.requesting
                : requestCard.actionLabel}
            </Button>
          ) : null}
        </Card>
      ) : null}

      {showOrganizerQueue ? (
        <section
          className="space-y-2.5"
          aria-labelledby="game-requests-heading"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="game-requests-heading"
              className="text-h2 font-bold tracking-[-0.02em]"
            >
              {m.game.requests.title}
            </h2>
            <p className="text-meta text-muted-foreground">{queueHeading}</p>
          </div>
          {seatHolds.length + game.pendingLevelRangeRequests.length > 0 ? (
            <div className="border-ink bg-paper divide-rule rounded-card divide-y overflow-hidden border">
              {seatHolds.map((request) => {
                const name = request.user.name ?? m.game.organizer.userFallback;
                return (
                  <GameRequestRow
                    key={request.id}
                    name={name}
                    image={request.user.image}
                    levelTenths={request.levelTenths}
                    detail={seatHoldRequestDetail(request, locale)}
                    held={seatHoldRemainingLabel(request.seatHeldUntil, locale)}
                    meta={seatHoldRequestRowMeta(request, locale)}
                    approvePending={
                      approveSeatHold.isPending &&
                      approveSeatHold.variables?.requestId === request.id
                    }
                    rejectPending={
                      rejectSeatHold.isPending &&
                      rejectSeatHold.variables?.requestId === request.id
                    }
                    onApprove={() =>
                      approveSeatHold.mutate({ requestId: request.id })
                    }
                    onReject={() =>
                      rejectSeatHold.mutate({ requestId: request.id })
                    }
                  />
                );
              })}
              {game.pendingLevelRangeRequests.map((request) => {
                const name = request.user.name ?? m.game.organizer.userFallback;
                return (
                  <GameRequestRow
                    key={request.id}
                    name={name}
                    image={request.user.image}
                    levelTenths={request.levelTenths}
                    detail={m.game.requests.sentence(
                      m.game.requests.outsideRange,
                    )}
                    held={null}
                    meta={levelRangeRequestRowMeta(request, locale)}
                    approvePending={
                      approve.isPending &&
                      approve.variables?.requestId === request.id
                    }
                    rejectPending={
                      reject.isPending &&
                      reject.variables?.requestId === request.id
                    }
                    onApprove={() => approve.mutate({ requestId: request.id })}
                    onReject={() => reject.mutate({ requestId: request.id })}
                  />
                );
              })}
            </div>
          ) : null}
          <p className="text-meta text-muted-foreground">
            {seatHolds.length > 0
              ? m.game.requests.note
              : game.pendingLevelRangeRequests.length > 0
                ? m.webGame.levelRange.sectionDescription
                : null}
          </p>
        </section>
      ) : null}
    </div>
  );
}
