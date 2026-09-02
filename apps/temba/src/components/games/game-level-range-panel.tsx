"use client";

import { toast } from "sonner";

import { RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { RequestRow } from "~/components/invites/request-row";
import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { formatLevelRangeGateCopy, formatLevelTenths } from "~/lib/level-range";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api, type RouterOutputs } from "~/trpc/react";

type GameDetail = RouterOutputs["games"]["byId"];

function requestMeta(levelTenths: number | null, provisional: boolean) {
  const level = formatLevelTenths(levelTenths) ?? "No Level";
  return provisional ? `${level} · Provisional` : level;
}

export function GameLevelRangePanel({ game }: { game: GameDetail }) {
  const utils = api.useUtils();
  const requestLevelRange = api.games.requestLevelRange.useMutation({
    onSuccess: async () => {
      toast.success("Request sent");
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
  const showRequester =
    game.canRequestLevelRange ||
    (game.levelRangeRequest != null &&
      game.levelRangeRequest.status !== "approved");
  const showOrganizerQueue = game.isOrganizer && gameHasRange;
  const pending = game.levelRangeRequest?.status === "pending";
  const rejected = game.levelRangeRequest?.status === "rejected";

  if (!showRequester && !showOrganizerQueue) {
    return null;
  }

  return (
    <div className="space-y-6">
      {showRequester ? (
        <Card variant="outlined" className="space-y-3">
          <h3 className="text-title font-medium">
            {pending
              ? "Request pending"
              : rejected
                ? "Request rejected"
                : "Request to play"}
          </h3>
          <p className="text-body text-muted-foreground">
            {formatLevelRangeGateCopy({
              levelMinTenths: game.levelMinTenths,
              levelMaxTenths: game.levelMaxTenths,
              viewerLevelTenths: game.viewerLevelTenths,
            })}
          </p>
          {pending ? (
            <p className="text-body text-muted-foreground">
              Organizers have not decided yet.
            </p>
          ) : (
            <Button
              type="button"
              variant="brand"
              disabled={
                requestLevelRange.isPending || !game.canRequestLevelRange
              }
              onClick={() => requestLevelRange.mutate({ gameId: game.id })}
            >
              {requestLevelRange.isPending
                ? "Requesting…"
                : rejected
                  ? "Request again"
                  : "Request to play"}
            </Button>
          )}
        </Card>
      ) : null}

      {showOrganizerQueue ? (
        <Section
          title="Level range requests"
          description="Approve grants a waiver without seating them. Reject lets them request again. Ignore leaves the request pending."
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
                    meta={requestMeta(request.levelTenths, request.provisional)}
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
