import type { Side } from "@repo/domain/football-board";
import {
  pickRoomAfterRead,
  pickRoomPollMs,
  pickRoomWithPick,
  type PickRoomView,
} from "@repo/domain/football-captain-pick";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { gamePath } from "../games/games-model";
import { useMessages } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api, type RouterOutputs } from "../trpc/react";
import { pickRoomRead, pickRoomUnknownUserIds } from "./pick-room-model";

export type PickRoom = Exclude<
  RouterOutputs["games"]["footballPickRoom"],
  { status: "stopped" | "closed" }
>;

type Reminded = "sent" | "recently";

type PickConfirm = "undo" | "stop";

/** Polls only while the screen is in front; React Query pauses it in the background. */
function useScreenFocused() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused;
}

/**
 * The Pick room's read and its doors. `view` is what the screen has on it,
 * by `pickRoomAfterRead`, and `room` the open room in it. A captain's own
 * pick shows at once and the next read corrects it. `confirm` is the undo
 * or stop an Organizer is asked to confirm, which those two doors close.
 */
export function usePickRoom(gameId: string) {
  const m = useMessages().football.pick;
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const focused = useScreenFocused();
  const fallback = gamePath(gameId) as Href;
  const game = api.games.byId.useQuery({ id: gameId });
  const board = api.games.footballBoard.useQuery({ gameId });
  const [view, setView] = useState<PickRoomView<PickRoom>>(null);
  const room = api.games.footballPickRoom.useQuery(
    { gameId },
    {
      enabled: focused,
      refetchInterval: focused ? pickRoomPollMs(view) : false,
      refetchOnWindowFocus: "always",
      staleTime: 0,
      retry: false,
    },
  );
  const [reminded, setReminded] = useState<Partial<Record<Side, Reminded>>>({});
  const [confirm, setConfirm] = useState<PickConfirm | null>(null);
  const refusal = room.error?.data?.code;
  const refused = refusal === "NOT_FOUND" || refusal === "FORBIDDEN";
  const read = pickRoomRead({
    fetchedAfterMount: room.isFetchedAfterMount,
    read: room.isSuccess ? room.data : undefined,
    refused,
  });
  const data = view === "closed" ? null : view;
  const pickId = data?.pickId ?? null;

  useEffect(() => {
    setReminded({});
  }, [pickId]);

  const backToGame = useCallback(async () => {
    await Promise.all([
      utils.games.footballBoard.invalidate({ gameId }),
      utils.games.byId.invalidate({ id: gameId }),
    ]);
    router.replace(fallback);
  }, [utils, gameId, router, fallback]);

  const leave = useCallback(
    async (message: string) => {
      toast.show(message);
      await backToGame();
    },
    [toast, backToGame],
  );

  useEffect(() => {
    if (!read) {
      return;
    }
    const next = pickRoomAfterRead<PickRoom>(view, read);
    setView(next.view);
    if (next.stopped) {
      void leave(m.stopped);
    }
  }, [read, view, leave, m.stopped]);

  const players = board.data?.players;
  const unknownIds =
    players && data ? pickRoomUnknownUserIds(data, players).join(",") : "";
  const refetchBoard = board.refetch;
  useEffect(() => {
    if (unknownIds) {
      void refetchBoard();
    }
  }, [unknownIds, refetchBoard]);

  const refresh = () => utils.games.footballPickRoom.invalidate({ gameId });
  const failure = (error: { message: string }) => toast.show(error.message);
  const remind = api.games.remindFootballCaptain.useMutation({
    onError: failure,
  });
  const start = api.games.startFootballPick.useMutation({
    onError: failure,
    onSettled: refresh,
  });
  const stop = api.games.stopFootballPick.useMutation({
    onSuccess: async () => {
      await refresh();
      setConfirm(null);
    },
    onError: failure,
  });
  const pickPlayer = api.games.pickFootballPlayer.useMutation({
    onMutate: async (input) => {
      await utils.games.footballPickRoom.cancel({ gameId });
      const previous = utils.games.footballPickRoom.getData({ gameId });
      utils.games.footballPickRoom.setData({ gameId }, (current) =>
        current
          ? pickRoomWithPick(current, {
              userId: input.pickedUserId,
              pickNumber: input.pickNumber,
            })
          : current,
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        utils.games.footballPickRoom.setData({ gameId }, context.previous);
      }
      failure(error);
    },
    onSuccess: (result) => {
      if (result.done) {
        void utils.games.footballBoard.invalidate({ gameId });
      }
    },
    onSettled: refresh,
  });
  const undoPick = api.games.undoFootballPick.useMutation({
    onError: failure,
    onSettled: () => {
      setConfirm(null);
      void refresh();
    },
  });

  return {
    view,
    room: data,
    players,
    balanceOn: board.data?.balanceOn ?? "ovr",
    kickoff: game.data?.windowStart ?? null,
    loadError: room.error && !refused ? room.error : null,
    reminded,
    remindingSide: remind.isPending ? (remind.variables?.side ?? null) : null,
    remind: (side: Side, captainName: string) =>
      remind.mutate(
        { gameId, side },
        {
          onSuccess: (result) => {
            setReminded((current) => ({
              ...current,
              [side]: result.sent ? "sent" : "recently",
            }));
            toast.show(
              result.sent
                ? m.reminded(captainName)
                : m.remindedRecently(captainName),
            );
          },
        },
      ),
    starting: start.isPending,
    start: () => start.mutate({ gameId }),
    stopping: stop.isPending,
    stop: () => stop.mutate({ gameId }),
    picking: pickPlayer.isPending,
    pick: (pick: {
      pickedUserId: string;
      pickNumber: number;
      forSide: Side | undefined;
    }) => pickPlayer.mutate({ gameId, ...pick }),
    undoing: undoPick.isPending,
    undo: (pickNumber: number, playerName: string) =>
      undoPick.mutate(
        { gameId, pickNumber },
        { onSuccess: () => toast.show(m.undone(playerName)) },
      ),
    confirm,
    askConfirm: (asked: PickConfirm) => setConfirm(asked),
    closeConfirm: () => setConfirm(null),
    seeTheDraft: backToGame,
  };
}

export type PickRoomController = ReturnType<typeof usePickRoom>;
