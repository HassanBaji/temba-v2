"use client";

import { toast } from "sonner";

import { RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { RequestRow } from "~/components/invites/request-row";
import { Section } from "~/components/layout/section";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { formatLevelTenths } from "@repo/domain/level-range";
import {
  LEVEL_RANGE_REQUEST_SENT_TOAST,
  levelRangeRequestCard,
} from "@repo/domain/level-range-request";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { requestRowMeta } from "@repo/domain/request-meta";
import { api, type RouterOutputs } from "~/trpc/react";

type GameDetail = RouterOutputs["games"]["byId"];

function requestMeta(request: {
  levelTenths: number | null;
  provisional: boolean;
  createdAt: Date | string;
}) {
  return requestRowMeta(request.createdAt, [
    formatLevelTenths(request.levelTenths) ?? "No Level",
    request.provisional ? "Provisional" : null,
  ]);
}

export function GameLevelRangePanel({ game }: { game: GameDetail }) {
  const utils = api.useUtils();
  const requestLevelRange = api.games.requestLevelRange.useMutation({
    onSuccess: async () => {
      toast.success(LEVEL_RANGE_REQUEST_SENT_TOAST);
      await utils.games.byId.invalidate({ id: game.id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
  const approve = api.games.approveLevelRangeRequest.useMutation({
    onSuccess: async () => {
      toast.success("Request approved");
      await utils.games.byId.invalidate({ id: game.id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
  const reject = api.games.rejectLevelRangeRequest.useMutation({
    onSuccess: async () => {
      toast.success("Request rejected");
      await utils.games.byId.invalidate({ id: game.id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const gameHasRange =
    game.levelMinTenths != null || game.levelMaxTenths != null;
  const requestCard = levelRangeRequestCard(game);
  const showOrganizerQueue = game.isOrganizer && gameHasRange;

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
              <Badge variant="warning">{requestCard.badge}</Badge>
            ) : null}
            {requestCard.badge === "Rejected" ? (
              <Badge variant="destructive">{requestCard.badge}</Badge>
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
                ? "Requesting…"
                : requestCard.actionLabel}
            </Button>
          ) : null}
        </Card>
      ) : null}

      {showOrganizerQueue ? (
        <Section
          title="Level range requests"
          description={
            game.pendingLevelRangeRequests.length > 0
              ? "Approve grants a waiver without seating them. Reject lets them request again."
              : undefined
          }
        >
          {game.pendingLevelRangeRequests.length > 0 ? (
            <RowList>
              {game.pendingLevelRangeRequests.map((request) => {
                const name = request.user.name ?? "User";
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
                    meta={requestMeta(request)}
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
            <p className="text-body text-muted-foreground">
              No pending Level range requests.
            </p>
          )}
        </Section>
      ) : null}
    </div>
  );
}
