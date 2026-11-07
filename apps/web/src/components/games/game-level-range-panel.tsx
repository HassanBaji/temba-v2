"use client";

import { toast } from "sonner";

import { RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { RequestRow } from "~/components/invites/request-row";
import { Section } from "~/components/layout/section";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  levelRangeQueueVisible,
  levelRangeRequestCard,
  levelRangeRequestRowMeta,
} from "@repo/domain/level-range-request";
import {
  requestsQueueHeading,
  seatHoldRequestRowMeta,
} from "@repo/domain/seat-hold-request";
import { useLocale, useMessages } from "~/components/locale-provider";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import type { TournamentDetails } from "@repo/domain/tournament-details";

type GameDetail = TournamentDetails;

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
        <Section
          title={m.game.requests.title}
          description={
            seatHolds.length > 0
              ? m.game.requests.note
              : game.pendingLevelRangeRequests.length > 0
                ? m.webGame.levelRange.sectionDescription
                : undefined
          }
        >
          {seatHolds.length + game.pendingLevelRangeRequests.length > 0 ? (
            <RowList>
              {seatHolds.map((request) => {
                const name = request.user.name ?? m.game.organizer.userFallback;
                return (
                  <RequestRow
                    key={request.id}
                    leading={
                      <UserAvatar
                        name={name}
                        image={request.user.image}
                        size="lg"
                      />
                    }
                    title={name}
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
                  <RequestRow
                    key={request.id}
                    leading={
                      <UserAvatar
                        name={name}
                        image={request.user.image}
                        size="lg"
                      />
                    }
                    title={name}
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
            </RowList>
          ) : (
            <p className="text-body text-muted-foreground">{queueHeading}</p>
          )}
        </Section>
      ) : null}
    </div>
  );
}
