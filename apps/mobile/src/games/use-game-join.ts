import { hubRegisterToast } from "@repo/domain/game-card";
import { gameJoinToast } from "@repo/domain/game-copy";
import { useCallback } from "react";

import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import type { JoinRequest } from "./games-model";

export function useGameJoin() {
  const toast = useToast();
  const utils = api.useUtils();

  const refreshLists = useCallback(
    () =>
      Promise.all([
        utils.games.listMyGames.invalidate(),
        utils.games.listMyMatchHistory.invalidate(),
        utils.users.home.invalidate(),
        utils.games.byId.invalidate(),
        utils.groups.byId.invalidate(),
      ]),
    [utils],
  );

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: (result) => {
      toast.show(gameJoinToast(result.waitlisted));
    },
    onError: (error) => toast.show(error.message),
    onSettled: refreshLists,
  });
  const register = api.games.register.useMutation({
    onSuccess: (result) => {
      toast.show(hubRegisterToast(result.waitlisted));
    },
    onError: (error) => toast.show(error.message),
    onSettled: refreshLists,
  });

  const pendingGameId =
    (registerSeat.isPending ? registerSeat.variables?.gameId : null) ??
    (register.isPending ? register.variables?.gameId : null) ??
    null;

  const join = useCallback(
    (request: JoinRequest) => {
      if (request.door === "register") {
        register.mutate(request.input);
      } else {
        registerSeat.mutate(request.input);
      }
    },
    [register, registerSeat],
  );

  return { join, pendingGameId, refreshLists };
}
