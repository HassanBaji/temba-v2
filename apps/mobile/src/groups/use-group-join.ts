import { groupJoinToast, type GroupJoinDoor } from "@repo/domain/group-join";
import { useCallback } from "react";

import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

export function useGroupJoin() {
  const toast = useToast();
  const utils = api.useUtils();

  const refresh = useCallback(
    () =>
      Promise.all([
        utils.groups.byId.invalidate(),
        utils.groups.mine.invalidate(),
        utils.groups.listPublic.invalidate(),
        utils.users.home.invalidate(),
        utils.communities.mine.invalidate(),
        utils.communities.byId.invalidate(),
      ]),
    [utils],
  );

  const options = (door: GroupJoinDoor) => ({
    onSuccess: () => toast.show(groupJoinToast(door)),
    onError: (error: { message: string }) => toast.show(error.message),
    onSettled: refresh,
  });

  const joinLoosePublic = api.groups.joinLoosePublic.useMutation(
    options("joinLoosePublic"),
  );
  const joinClubPublic = api.groups.joinClubPublic.useMutation(
    options("joinClubPublic"),
  );
  const requestJoin = api.groups.requestJoin.useMutation(
    options("requestJoin"),
  );

  const pendingGroupId =
    (joinLoosePublic.isPending ? joinLoosePublic.variables?.groupId : null) ??
    (joinClubPublic.isPending ? joinClubPublic.variables?.groupId : null) ??
    (requestJoin.isPending ? requestJoin.variables?.groupId : null) ??
    null;

  const join = useCallback(
    (groupId: string, door: GroupJoinDoor) => {
      if (door === "requestJoin") {
        requestJoin.mutate({ groupId });
      } else if (door === "joinClubPublic") {
        joinClubPublic.mutate({ groupId });
      } else {
        joinLoosePublic.mutate({ groupId });
      }
    },
    [joinClubPublic, joinLoosePublic, requestJoin],
  );

  return { join, pendingGroupId };
}
