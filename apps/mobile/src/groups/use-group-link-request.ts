import {
  GROUP_LINK_REQUEST_DECLINED_TOAST,
  groupLinkRequestAcceptConfirm,
  groupLinkRequestAcceptedToast,
  groupLinkRequestDeclineConfirm,
} from "@repo/domain/group-link-request";
import { useRef, useState } from "react";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

export type GroupLinkRequestRow = {
  id: string;
  groupName: string | null;
  venueName: string;
};

export function useGroupLinkRequest() {
  const toast = useToast();
  const utils = api.useUtils();
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const accepting = useRef<GroupLinkRequestRow | null>(null);

  async function refresh() {
    await Promise.all([
      utils.groups.pendingLinkRequests.invalidate(),
      utils.groups.byId.invalidate(),
      utils.groups.mine.invalidate(),
      utils.groups.mineLoose.invalidate(),
      utils.communities.mine.invalidate(),
    ]);
  }

  const accept = api.groups.acceptLinkRequest.useMutation({
    onSuccess: async () => {
      const row = accepting.current;
      if (row) {
        toast.show(groupLinkRequestAcceptedToast(row.groupName, row.venueName));
      }
      await refresh();
    },
    onError: (error) => {
      toast.show(error.message);
      void refresh();
    },
    onSettled: () => setConfirm(null),
  });
  const decline = api.groups.declineLinkRequest.useMutation({
    onSuccess: async () => {
      toast.show(GROUP_LINK_REQUEST_DECLINED_TOAST);
      await refresh();
    },
    onError: (error) => {
      toast.show(error.message);
      void refresh();
    },
    onSettled: () => setConfirm(null),
  });

  return {
    confirm,
    confirmPending: accept.isPending || decline.isPending,
    closeConfirm: () => setConfirm(null),
    pendingRequestId: accept.isPending
      ? (accept.variables?.requestId ?? null)
      : decline.isPending
        ? (decline.variables?.requestId ?? null)
        : null,
    askAccept: (row: GroupLinkRequestRow) => {
      const copy = groupLinkRequestAcceptConfirm(row.groupName, row.venueName);
      setConfirm({
        title: copy.title,
        description: copy.description,
        details: copy.consequences,
        confirmLabel: copy.confirmLabel,
        cancelLabel: copy.cancelLabel,
        onConfirm: () => {
          accepting.current = row;
          accept.mutate({ requestId: row.id });
        },
      });
    },
    askDecline: (row: GroupLinkRequestRow) => {
      const copy = groupLinkRequestDeclineConfirm(row.venueName);
      setConfirm({
        ...copy,
        onConfirm: () => decline.mutate({ requestId: row.id }),
      });
    },
  };
}
