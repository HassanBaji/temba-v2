"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  liveBoardScene,
  type LiveBoardScreen,
  type LiveBoardTheme,
} from "@repo/domain/live-board";

import { OWN_ERROR_UI } from "~/trpc/query-client";
import { api, type RouterOutputs } from "~/trpc/react";

export type LiveBoardState = RouterOutputs["liveBoards"]["forGame"];
export type LiveBoardControlState = NonNullable<LiveBoardState["board"]>;

const CONTROL_REFRESH_MS = 5_000;

type BoardSettings = {
  rotate?: boolean;
  rotateSeconds?: number;
  heldScreen?: LiveBoardScreen;
  theme?: LiveBoardTheme;
  showQr?: boolean;
};

/**
 * A Game's Live board for its Organizer: the running board, kept fresh while
 * it is on so the connected TVs stay current, and the control's doors. A
 * setting shows at once and is put back if the API refuses it.
 */
export function useLiveBoard(gameId: string, enabled: boolean) {
  const utils = api.useUtils();
  const query = api.liveBoards.forGame.useQuery(
    { gameId },
    {
      enabled,
      refetchInterval: (current) =>
        current.state.data?.board ? CONTROL_REFRESH_MS : false,
    },
  );
  const refresh = React.useCallback(
    () => utils.liveBoards.forGame.invalidate({ gameId }),
    [gameId, utils],
  );
  // A patch keeps the time the data arrived, so the clock offset read from
  // it stays right, and drops any answer already on its way that predates it.
  const patch = React.useCallback(
    async (change: Partial<LiveBoardControlState>, updatedAt: number) => {
      await utils.liveBoards.forGame.cancel({ gameId });
      utils.liveBoards.forGame.setData(
        { gameId },
        (current) =>
          current?.board
            ? { ...current, board: { ...current.board, ...change } }
            : current,
        { updatedAt },
      );
    },
    [gameId, utils],
  );
  const failed = (error: { message: string }) => {
    toast.error(error.message);
    void refresh();
  };

  const offsetMs = query.data?.board
    ? query.data.board.serverNow.getTime() - query.dataUpdatedAt
    : 0;

  const start = api.liveBoards.start.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async (board) => {
      await utils.liveBoards.forGame.cancel({ gameId });
      utils.liveBoards.forGame.setData({ gameId }, (current) =>
        current ? { ...current, board } : current,
      );
      void refresh();
    },
  });
  const update = api.liveBoards.update.useMutation({
    onError: failed,
    onSettled: refresh,
  });
  const setMessage = api.liveBoards.setMessage.useMutation({
    onError: failed,
    onSettled: refresh,
  });
  const disconnectTv = api.liveBoards.disconnectTv.useMutation({
    onError: failed,
    onSettled: refresh,
  });
  const stop = api.liveBoards.stop.useMutation({
    meta: OWN_ERROR_UI,
    onSettled: refresh,
  });

  function change(settings: BoardSettings) {
    const board = query.data?.board;
    if (!board) {
      return;
    }
    const now = new Date(Date.now() + offsetMs);
    const restarts =
      settings.rotate !== undefined ||
      settings.rotateSeconds !== undefined ||
      settings.heldScreen !== undefined;
    void patch(
      {
        ...settings,
        rotate: settings.rotate ?? (settings.heldScreen ? false : board.rotate),
        heldScreen:
          settings.heldScreen ??
          (settings.rotate === false && board.rotate
            ? liveBoardScene(board, now).screen
            : board.heldScreen),
        rotationStartedAt: restarts ? now : board.rotationStartedAt,
      },
      query.dataUpdatedAt,
    );
    update.mutate({ gameId, ...settings });
  }

  /** Show on TV: starts the board unless one is on or already starting. */
  function ensureStarted() {
    if (!query.data?.board && !start.isPending) {
      start.mutate({ gameId });
    }
  }

  return {
    state: query.data ?? null,
    board: query.data?.board ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    /** Add to this device's clock to read the server's. */
    offsetMs,
    start,
    ensureStarted,
    change,
    setMessage,
    disconnectTv,
    stop,
  };
}

export type LiveBoardHandle = ReturnType<typeof useLiveBoard>;
