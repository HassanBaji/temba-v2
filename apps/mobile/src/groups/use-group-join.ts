import { groupJoinToast, type GroupJoinDoor } from "@repo/domain/group-join";
import { useCallback, useState } from "react";

import { useLocale } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

export function useGroupJoin() {
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();

  const refresh = useCallback(
    () =>
      Promise.all([
        utils.groups.byId.invalidate(),
        utils.groups.mine.invalidate(),
        utils.groups.listPublic.invalidate(),
        utils.users.home.invalidate(),
      ]),
    [utils],
  );

  const options = (door: GroupJoinDoor) => ({
    onSuccess: () => toast.show(groupJoinToast(door, locale)),
    onError: (error: { message: string }) => toast.show(error.message),
    onSettled: refresh,
  });

  const joinPublic = api.groups.joinPublic.useMutation(options("joinPublic"));
  const [requestingGroupId, setRequestingGroupId] = useState<string | null>(
    null,
  );
  const requestJoin = api.groups.requestJoin.useMutation({
    ...options("requestJoin"),
    onSuccess: () => {
      setRequestingGroupId(null);
      toast.show(groupJoinToast("requestJoin", locale));
    },
  });

  const pendingGroupId =
    (joinPublic.isPending ? joinPublic.variables?.groupId : null) ??
    (requestJoin.isPending ? requestJoin.variables?.groupId : null) ??
    null;

  const join = useCallback(
    (groupId: string, door: GroupJoinDoor) => {
      if (door === "requestJoin") {
        setRequestingGroupId(groupId);
      } else {
        joinPublic.mutate({ groupId });
      }
    },
    [joinPublic],
  );

  return {
    join,
    pendingGroupId,
    requestSheet: {
      visible: requestingGroupId != null,
      pending: requestJoin.isPending,
      onSend: (note: string) => {
        if (requestingGroupId) {
          requestJoin.mutate({
            groupId: requestingGroupId,
            note: note.trim() || undefined,
          });
        }
      },
      onClose: () => setRequestingGroupId(null),
    },
  };
}
