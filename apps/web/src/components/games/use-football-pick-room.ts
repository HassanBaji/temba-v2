"use client";

import {
  pickRoomAfterRead,
  pickRoomPollMs,
  pickRoomWithPick,
  type PickRoomView,
} from "@repo/domain/football-captain-pick";
import {
  pickRoomRead,
  pickRoomUnknownUserIds,
} from "@repo/domain/football-pick-room";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useMessages } from "~/components/locale-provider";
import { gameHomeHref } from "~/lib/dashboard-paths";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

import type { OpenPickRoom } from "./football-pick-room-view";

export type FootballPickRoomActions = ReturnType<
  typeof useFootballPickRoom
>["actions"];

/**
 * The Pick room's reads and its doors (ADR-0109). It reads
 * `games.footballPickRoom` every two seconds while the tab is visible, which
 * is what keeps a captain "In the room". What a read puts on the page is
 * `pickRoomAfterRead`'s to say: a pick stopped while it waits or is live
 * closes the room and says so, and a finished pick stays on the page through
 * the closed or not-found reads that follow once the Organizer publishes or
 * edits the draft. It is then read slowly, and a new room the Organizer
 * opens takes its place. A closed room is read again only when the tab comes
 * back in front. A pick shows at once and the next read corrects it.
 */
export function useFootballPickRoom(gameId: string) {
  const m = useMessages().football.pick;
  const router = useRouter();
  const utils = api.useUtils();
  const gameHref = gameHomeHref(gameId);
  const game = api.games.byId.useQuery({ id: gameId });
  const board = api.games.footballBoard.useQuery({ gameId });
  const [view, setView] = React.useState<PickRoomView<OpenPickRoom>>(null);
  const room = api.games.footballPickRoom.useQuery(
    { gameId },
    {
      refetchInterval: pickRoomPollMs(view),
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: "always",
      staleTime: 0,
      retry: false,
    },
  );
  const refused =
    isNotFoundError(room.error) || room.error?.data?.code === "FORBIDDEN";
  const read = pickRoomRead({
    fetchedAfterMount: room.isFetchedAfterMount,
    read: room.isSuccess ? room.data : undefined,
    refused,
  });
  const open = view === "closed" ? null : view;

  const leave = React.useCallback(
    async (message: string) => {
      toast(message);
      await Promise.all([
        utils.games.footballBoard.invalidate({ gameId }),
        utils.games.byId.invalidate({ id: gameId }),
      ]);
      router.replace(gameHref);
    },
    [utils, gameId, router, gameHref],
  );

  React.useEffect(() => {
    if (!read) {
      return;
    }
    const next = pickRoomAfterRead<OpenPickRoom>(view, read);
    setView(next.view);
    if (next.stopped) {
      void leave(m.stopped);
    }
  }, [read, view, leave, m.stopped]);

  const players = board.data?.players;
  const unknownIds =
    players && open ? pickRoomUnknownUserIds(open, players).join(",") : "";
  const refetchBoard = board.refetch;
  React.useEffect(() => {
    if (unknownIds) {
      void refetchBoard();
    }
  }, [unknownIds, refetchBoard]);

  const refresh = () => utils.games.footballPickRoom.invalidate({ gameId });
  const failure = (error: { message: string }) => toast.error(error.message);
  const remind = api.games.remindFootballCaptain.useMutation({
    meta: OWN_ERROR_UI,
    onError: failure,
  });
  const start = api.games.startFootballPick.useMutation({
    meta: OWN_ERROR_UI,
    onError: failure,
    onSettled: refresh,
  });
  const stop = api.games.stopFootballPick.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: refresh,
    onError: failure,
  });
  const pick = api.games.pickFootballPlayer.useMutation({
    meta: OWN_ERROR_UI,
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
  const undo = api.games.undoFootballPick.useMutation({
    meta: OWN_ERROR_UI,
    onError: failure,
    onSettled: () => {
      void refresh();
    },
  });

  const seeTheDraft = async () => {
    await Promise.all([
      utils.games.footballBoard.invalidate({ gameId }),
      utils.games.byId.invalidate({ id: gameId }),
    ]);
    router.push(gameHref);
  };

  return {
    view,
    players,
    balanceOn: board.data?.balanceOn ?? "ovr",
    kickoff: game.data?.windowStart ?? null,
    /** The room was never read to this viewer. */
    missing: view == null && isNotFoundError(room.error),
    loadError: (open || refused ? null : room.error) ?? board.error,
    retry: () => {
      void room.refetch();
      void board.refetch();
    },
    actions: { remind, start, stop, pick, undo },
    seeTheDraft,
  };
}
