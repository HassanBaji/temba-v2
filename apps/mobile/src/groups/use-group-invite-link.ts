import {
  GROUP_LINK_COPIED_TOAST,
  GROUP_LINK_RESET_TOAST,
} from "@repo/domain/group-settings";
import * as Clipboard from "expo-clipboard";
import { useCallback } from "react";

import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

/**
 * The Group's live Invite link for a minter: read it, copy it (minting one
 * when none is live) and reset it so old links stop working.
 */
export function useGroupInviteLink(groupId: string, enabled: boolean) {
  const toast = useToast();
  const utils = api.useUtils();
  const link = api.groups.getInviteLink.useQuery({ groupId }, { enabled });
  const create = api.groups.createInviteLink.useMutation({
    onError: (error) => toast.show(error.message),
  });
  const reset = api.groups.resetInviteLink.useMutation({
    onSuccess: async (next) => {
      utils.groups.getInviteLink.setData({ groupId }, next);
      toast.show(GROUP_LINK_RESET_TOAST);
    },
    onError: (error) => toast.show(error.message),
  });

  const copy = useCallback(async () => {
    try {
      const live =
        link.data ??
        (await utils.groups.getInviteLink.fetch({ groupId })) ??
        (await create.mutateAsync({ groupId }));
      utils.groups.getInviteLink.setData({ groupId }, live);
      await Clipboard.setStringAsync(live.shortUrl ?? live.inviteUrl);
      toast.show(GROUP_LINK_COPIED_TOAST);
    } catch (error) {
      toast.show((error as { message?: string }).message ?? "Could not copy");
    }
  }, [link.data, utils, groupId, create, toast]);

  return {
    url: link.data ? (link.data.shortUrl ?? link.data.inviteUrl) : null,
    loading: enabled && link.isPending,
    copy,
    copyPending: create.isPending,
    create: () =>
      create.mutate(
        { groupId },
        {
          onSuccess: (next) =>
            utils.groups.getInviteLink.setData({ groupId }, next),
        },
      ),
    createPending: create.isPending,
    reset: () => reset.mutate({ groupId }),
    resetPending: reset.isPending,
  };
}
