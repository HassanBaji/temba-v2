import {
  GROUP_DELETED_TOAST,
  GROUP_IMAGE_REMOVED_TOAST,
  GROUP_IMAGE_SAVED_TOAST,
  GROUP_REQUEST_APPROVED_TOAST,
  GROUP_REQUEST_REJECTED_TOAST,
} from "@repo/domain/group-admin";
import type { GroupHomeData } from "@repo/domain/group-data";
import { useCallback } from "react";

import { slotOf } from "../lib/slot-of";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { pickGroupImage } from "./pick-group-image";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

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

  const setRequiresApproval = api.groups.setRequiresApproval.useMutation({
    onSuccess: () => utils.groups.byId.invalidate({ id: groupId }),
    onError,
  });

  const approve = api.groups.approveJoinRequest.useMutation({
    onSuccess: async () => {
      toast.show(GROUP_REQUEST_APPROVED_TOAST);
      await Promise.all([
        refreshGroup(),
        utils.groups.listJoinRequests.invalidate({ groupId }),
        utils.communities.mine.invalidate(),
      ]);
    },
    onError,
  });

  const reject = api.groups.rejectJoinRequest.useMutation({
    onSuccess: async () => {
      toast.show(GROUP_REQUEST_REJECTED_TOAST);
      await Promise.all([
        refreshGroup(),
        utils.groups.listJoinRequests.invalidate({ groupId }),
      ]);
    },
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
      requiresApprovalPending: setRequiresApproval.isPending,
      onRequiresApprovalChange: (next: boolean) =>
        setRequiresApproval.mutate({ groupId, requiresApproval: next }),
      approvePendingId: approve.isPending
        ? (approve.variables?.requestId ?? null)
        : null,
      rejectPendingId: reject.isPending
        ? (reject.variables?.requestId ?? null)
        : null,
      onApprove: (requestId: string) => approve.mutate({ requestId }),
      onReject: (requestId: string) => reject.mutate({ requestId }),
      onRetry: () => void requests.refetch(),
    },
    imagePending: uploadImage.isPending || clearImage.isPending,
    changeImage,
    clearImage: () => clearImage.mutate({ groupId }),
    deletePending: deleteGroup.isPending,
    deleteGroup: () => deleteGroup.mutate({ groupId }),
    refetchRequests: () =>
      data?.canDecideJoinRequests ? requests.refetch() : Promise.resolve(),
  };
}
