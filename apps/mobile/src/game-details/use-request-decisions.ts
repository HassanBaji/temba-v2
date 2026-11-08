import type { OrganizerRequest } from "@repo/domain/game-requests";

import { useMessages } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

export type RequestDecisions = {
  decidingRequestId: string | null;
  onApprove: (request: OrganizerRequest) => void;
  onReject: (request: OrganizerRequest) => void;
};

/** Approve and Decline on the Game's Requests queue: a Seat hold goes to the Group, a Level range request to the Game. */
export function useRequestDecisions({
  refresh,
}: {
  refresh: () => Promise<unknown>;
}): RequestDecisions {
  const m = useMessages();
  const toast = useToast();
  const copy = m.mobileGameDetails;
  const failure = (error: { message: string }) => toast.show(error.message);
  const approveLevel = api.games.approveLevelRangeRequest.useMutation({
    onSuccess: () => toast.show(copy.toast.requestApproved),
    onError: failure,
    onSettled: refresh,
  });
  const rejectLevel = api.games.rejectLevelRangeRequest.useMutation({
    onSuccess: () => toast.show(copy.toast.requestRejected),
    onError: failure,
    onSettled: refresh,
  });
  const approveSeatHold = api.groups.approveJoinRequest.useMutation({
    onSuccess: () => toast.show(copy.toast.requestApproved),
    onError: failure,
    onSettled: refresh,
  });
  const rejectSeatHold = api.groups.rejectJoinRequest.useMutation({
    onSuccess: () => toast.show(copy.toast.requestRejected),
    onError: failure,
    onSettled: refresh,
  });
  return {
    decidingRequestId:
      (approveLevel.isPending ? approveLevel.variables?.requestId : null) ??
      (rejectLevel.isPending ? rejectLevel.variables?.requestId : null) ??
      (approveSeatHold.isPending
        ? approveSeatHold.variables?.requestId
        : null) ??
      (rejectSeatHold.isPending ? rejectSeatHold.variables?.requestId : null) ??
      null,
    onApprove: (request) =>
      request.kind === "seat_hold"
        ? approveSeatHold.mutate({ requestId: request.id })
        : approveLevel.mutate({ requestId: request.id }),
    onReject: (request) =>
      request.kind === "seat_hold"
        ? rejectSeatHold.mutate({ requestId: request.id })
        : rejectLevel.mutate({ requestId: request.id }),
  };
}
