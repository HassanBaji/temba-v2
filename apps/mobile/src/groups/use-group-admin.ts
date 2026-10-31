import {
  GROUP_DELETED_TOAST,
  GROUP_IMAGE_REMOVED_TOAST,
  GROUP_IMAGE_SAVED_TOAST,
  GROUP_JOIN_REQUEST_UNDO_LABEL,
  groupJoinRequestDecidedToast,
  type GroupJoinRequestDecision,
} from "@repo/domain/group-admin";
import type {
  GroupHomeData,
  GroupJoinRequestData,
} from "@repo/domain/group-data";
import { useCallback, useState } from "react";

import type { Slot } from "../home/home-model";
import { slotOf } from "../lib/slot-of";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { pickGroupImage } from "./pick-group-image";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export type GroupApproverHandlers = {
  requests: Slot<GroupJoinRequestData[]>;
  approvePendingId: string | null;
  rejectPendingId: string | null;
  onApprove: (request: GroupJoinRequestData) => void;
  onAskReject: (request: GroupJoinRequestData) => void;
  onRetry: () => void;
  onChangePolicy: () => void;
  rejectSheet: {
    request: GroupJoinRequestData | null;
    pending: "reject" | "block" | null;
    onReject: (block: boolean) => void;
    onClose: () => void;
  };
  whoCanJoinSheet: {
    visible: boolean;
    pending: boolean;
    onSave: (requiresApproval: boolean) => void;
    onClose: () => void;
  };
};

export function useGroupAdmin(
  groupId: string,
  data: GroupHomeData | undefined,
  onDeleted: () => void,
) {
  const toast = useToast();
  const utils = api.useUtils();
  const communityId = data?.communityId ?? null;

  const refreshGroup = useCallback(
    () =>
      Promise.all([
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.mine.invalidate(),
        communityId
          ? utils.communities.byId.invalidate({ id: communityId })
          : Promise.resolve(),
      ]),
    [utils, groupId, communityId],
  );

  const requests = api.groups.listJoinRequests.useQuery(
    { groupId },
    { ...REFETCH_ON_FOREGROUND, enabled: Boolean(data?.canDecideJoinRequests) },
  );

  const onError = (error: { message: string }) => toast.show(error.message);

  const [rejecting, setRejecting] = useState<GroupJoinRequestData | null>(null);
  const [whoCanJoinOpen, setWhoCanJoinOpen] = useState(false);

  const setRequiresApproval = api.groups.setRequiresApproval.useMutation({
    onSuccess: async () => {
      setWhoCanJoinOpen(false);
      await utils.groups.byId.invalidate({ id: groupId });
    },
    onError,
  });

  const refreshRequests = useCallback(
    () =>
      Promise.all([
        refreshGroup(),
        utils.groups.listJoinRequests.invalidate({ groupId }),
        utils.communities.mine.invalidate(),
      ]),
    [refreshGroup, utils, groupId],
  );

  const undo = api.groups.undoJoinRequestDecision.useMutation({
    onSettled: refreshRequests,
    onError,
  });

  const showDecided = (
    request: GroupJoinRequestData,
    decision: GroupJoinRequestDecision,
  ) =>
    toast.show(
      groupJoinRequestDecidedToast(request.user.name ?? "User", decision),
      {
        label: GROUP_JOIN_REQUEST_UNDO_LABEL,
        onPress: () => undo.mutate({ requestId: request.id }),
      },
    );

  const approve = api.groups.approveJoinRequest.useMutation({
    onSettled: refreshRequests,
    onError,
  });

  const reject = api.groups.rejectJoinRequest.useMutation({
    onSettled: refreshRequests,
    onError,
  });

  const refreshImage = useCallback(
    () =>
      Promise.all([
        refreshGroup(),
        utils.groups.listPublic.invalidate(),
        utils.groups.pendingLookupInvites.invalidate(),
      ]),
    [refreshGroup, utils],
  );

  const uploadImage = api.groups.uploadImage.useMutation({
    onSuccess: async () => {
      toast.show(GROUP_IMAGE_SAVED_TOAST);
      await refreshImage();
    },
    onError,
  });

  const clearImage = api.groups.clearImage.useMutation({
    onSuccess: async () => {
      toast.show(GROUP_IMAGE_REMOVED_TOAST);
      await refreshImage();
    },
    onError,
  });

  const deleteGroup = api.groups.delete.useMutation({
    onSuccess: async (result) => {
      toast.show(GROUP_DELETED_TOAST);
      await Promise.all([
        utils.groups.mine.invalidate(),
        utils.users.home.invalidate(),
        result.communityId
          ? utils.communities.byId.invalidate({ id: result.communityId })
          : Promise.resolve(),
        result.communityId
          ? utils.communities.mine.invalidate()
          : Promise.resolve(),
      ]);
      onDeleted();
    },
    onError,
  });

  const changeImage = useCallback(async () => {
    if (uploadImage.isPending) {
      return;
    }
    const picked = await pickGroupImage();
    if (!picked) {
      return;
    }
    if (!picked.image.ok) {
      toast.show(picked.image.error);
      return;
    }
    uploadImage.mutate({
      groupId,
      contentType: picked.image.contentType,
      dataBase64: picked.image.dataBase64,
    });
  }, [uploadImage, groupId, toast]);

  return {
    approver: {
      requests: slotOf(requests),
      approvePendingId: approve.isPending
        ? (approve.variables?.requestId ?? null)
        : null,
      rejectPendingId: reject.isPending
        ? (reject.variables?.requestId ?? null)
        : null,
      onApprove: (request) =>
        approve.mutate(
          { requestId: request.id },
          { onSuccess: () => showDecided(request, "approved") },
        ),
      onAskReject: setRejecting,
      onRetry: () => void requests.refetch(),
      onChangePolicy: () => setWhoCanJoinOpen(true),
      rejectSheet: {
        request: rejecting,
        pending: reject.isPending
          ? reject.variables?.block
            ? "block"
            : "reject"
          : null,
        onReject: (block) => {
          if (!rejecting) {
            return;
          }
          const request = rejecting;
          reject.mutate(
            { requestId: request.id, block },
            {
              onSuccess: () => {
                setRejecting(null);
                showDecided(request, block ? "blocked" : "rejected");
              },
            },
          );
        },
        onClose: () => setRejecting(null),
      },
      whoCanJoinSheet: {
        visible: whoCanJoinOpen,
        pending: setRequiresApproval.isPending,
        onSave: (requiresApproval) =>
          setRequiresApproval.mutate({ groupId, requiresApproval }),
        onClose: () => setWhoCanJoinOpen(false),
      },
    } satisfies GroupApproverHandlers,
    imagePending: uploadImage.isPending || clearImage.isPending,
    changeImage,
    clearImage: () => clearImage.mutate({ groupId }),
    deletePending: deleteGroup.isPending,
    deleteGroup: () => deleteGroup.mutate({ groupId }),
    refetchRequests: () =>
      data?.canDecideJoinRequests ? requests.refetch() : Promise.resolve(),
  };
}
