import {
  groupJoinRequestDecidedToast,
  groupRejectRequestCopy,
  type GroupJoinRequestDecision,
} from "@repo/domain/group-admin";
import type {
  GroupHomeData,
  GroupJoinRequestData,
} from "@repo/domain/group-data";
import { useCallback, useState } from "react";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { slotOf } from "../lib/slot-of";
import { useToast } from "../primitives/toast";
import { useRequestAnswers } from "../requests/request-answers-provider";
import { api } from "../trpc/react";
import { pickGroupImage } from "./pick-group-image";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

type DecidedRequest = { id: string; name: string };

export type GroupApproverHandlers = {
  requests: Slot<GroupJoinRequestData[]>;
  approvePendingId: string | null;
  rejectPendingId: string | null;
  onApprove: (request: GroupJoinRequestData) => void;
  onAskReject: (request: GroupJoinRequestData) => void;
  onAskBlock: (request: DecidedRequest) => void;
  onRetry: () => void;
  onChangePolicy: () => void;
  rejectSheet: {
    request: GroupJoinRequestData | null;
    pending: "reject" | "block" | null;
    onReject: (block: boolean) => void;
    onClose: () => void;
  };
  blockSheet: {
    request: ConfirmRequest | null;
    pending: boolean;
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
) {
  const locale = useLocale();
  const m = useMessages();
  const toast = useToast();
  const utils = api.useUtils();
  const answers = useRequestAnswers();

  const refreshGroup = useCallback(
    () =>
      Promise.all([
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.mine.invalidate(),
      ]),
    [utils, groupId],
  );

  const requests = api.groups.listJoinRequests.useQuery(
    { groupId },
    { ...REFETCH_ON_FOREGROUND, enabled: Boolean(data?.canDecideJoinRequests) },
  );

  const onError = (error: { message: string }) => toast.show(error.message);

  const [rejecting, setRejecting] = useState<GroupJoinRequestData | null>(null);
  const [blocking, setBlocking] = useState<DecidedRequest | null>(null);
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
        utils.notifications.waitingRequests.invalidate(),
      ]),
    [refreshGroup, utils, groupId],
  );

  const undo = api.groups.undoJoinRequestDecision.useMutation({
    onSettled: refreshRequests,
    onError,
  });

  const showDecided = (
    request: DecidedRequest,
    decision: GroupJoinRequestDecision,
  ) =>
    toast.show(groupJoinRequestDecidedToast(request.name, decision, locale), {
      label: m.group.admin.undoLabel,
      onPress: () => undo.mutate({ requestId: request.id }),
    });
  const decided = (request: GroupJoinRequestData): DecidedRequest => ({
    id: request.id,
    name: request.user.name ?? m.mobileGroup.unnamedUser,
  });

  const approve = api.groups.approveJoinRequest.useMutation({
    onSettled: refreshRequests,
    onError,
  });

  const reject = api.groups.rejectJoinRequest.useMutation({
    onSettled: refreshRequests,
    onError,
  });

  const blockConfirm = (request: DecidedRequest): ConfirmRequest => {
    const copy = groupRejectRequestCopy(request.name, locale);
    return {
      title: copy.title,
      description: copy.description,
      confirmLabel: copy.blockLabel,
      cancelLabel: copy.cancelLabel,
      onConfirm: () =>
        reject.mutate(
          { requestId: request.id, block: true },
          {
            onSuccess: () => {
              setBlocking(null);
              showDecided(request, "blocked");
            },
          },
        ),
    };
  };

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
      toast.show(m.group.admin.imageSavedToast);
      await refreshImage();
    },
    onError,
  });

  const clearImage = api.groups.clearImage.useMutation({
    onSuccess: async () => {
      toast.show(m.group.admin.imageRemovedToast);
      await refreshImage();
    },
    onError,
  });

  const changeImage = useCallback(async () => {
    if (uploadImage.isPending) {
      return;
    }
    const picked = await pickGroupImage(locale);
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
  }, [uploadImage, groupId, toast, locale]);

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
          { onSuccess: () => showDecided(decided(request), "approved") },
        ),
      onAskReject: setRejecting,
      onAskBlock: setBlocking,
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
                showDecided(decided(request), block ? "blocked" : "rejected");
              },
            },
          );
        },
        onClose: () => setRejecting(null),
      },
      blockSheet: {
        request: blocking ? blockConfirm(blocking) : null,
        pending: reject.isPending && reject.variables?.block === true,
        onClose: () => setBlocking(null),
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
    refetchRequests: () =>
      data?.canDecideJoinRequests
        ? Promise.all([requests.refetch(), answers.refetch()])
        : Promise.resolve(),
  };
}
