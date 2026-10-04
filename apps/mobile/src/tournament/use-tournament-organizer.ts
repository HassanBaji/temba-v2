import { GAME_TOAST, KICK_ACTION, kickedToast } from "@repo/domain/game-copy";
import {
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRequest,
} from "@repo/domain/game-kick-confirm";
import type { TournamentDetails } from "@repo/domain/tournament-details";
import type { KnockoutMatchPlace } from "@repo/domain/tournament-knockout-view";
import { isKnockoutOnly } from "@repo/domain/tournament-rounds";
import {
  UNDO_KNOCKOUT_DRAW_CONFIRM_COPY,
  UNDO_KNOCKOUT_DRAW_CONFIRM_TITLE,
  UNDO_POOL_DRAW_CONFIRM_COPY,
  UNDO_POOL_DRAW_CONFIRM_LABEL,
  UNDO_POOL_DRAW_CONFIRM_TITLE,
} from "@repo/domain/tournament-pool-draw";
import { useState } from "react";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import type { OrganizerSheetsProps } from "./organizer-sheets";
import type { OrganizerCardHandlers } from "./organizer-card";
import { drawToast } from "./organizer-model";

type Options = {
  gameId: string;
  game: TournamentDetails | null;
  refresh: () => Promise<unknown>;
  setConfirm: (request: ConfirmRequest | null) => void;
};

export type TournamentSheet =
  | "merge"
  | "draw"
  | "rounds"
  | { walkover: KnockoutMatchPlace }
  | null;

export function useTournamentOrganizer({
  gameId,
  game,
  refresh,
  setConfirm,
}: Options) {
  const toast = useToast();
  const knockoutOnly =
    game != null && isKnockoutOnly(game.format, game.tournamentShape);
  const [sheet, setSheet] = useState<TournamentSheet>(null);
  const [roundCount, setRoundCount] = useState<number | null>(null);

  const failure = (error: { message: string }) => toast.show(error.message);
  const settled = async () => {
    setConfirm(null);
    await refresh();
  };

  const merge = api.games.mergeHalfTeams.useMutation({
    onSuccess: () => {
      toast.show(GAME_TOAST.halfTeamsMerged);
      setSheet(null);
    },
    onSettled: refresh,
  });
  const draw = api.games.drawPools.useMutation({
    onSuccess: () => toast.show(drawToast("drawn", knockoutOnly)),
    onSettled: refresh,
  });
  const post = api.games.postPoolDraw.useMutation({
    onSuccess: () => {
      toast.show(drawToast("posted", knockoutOnly));
      setSheet(null);
    },
    onSettled: refresh,
  });
  const undo = api.games.undoPoolDraw.useMutation({
    onSuccess: () => toast.show(drawToast("undone", knockoutOnly)),
    onError: failure,
    onSettled: settled,
  });
  const updateRounds = api.games.updateRoundCount.useMutation({
    onSuccess: () => {
      toast.show("Rounds saved");
      setSheet(null);
    },
    onSettled: refresh,
  });
  const cancelMatch = api.games.cancelMatch.useMutation({
    onSuccess: (result) => {
      toast.show(
        result.cancelledGame
          ? GAME_TOAST.gameCancelled
          : GAME_TOAST.matchCancelled,
      );
      setSheet(null);
    },
    onSettled: refresh,
  });
  const kick = api.games.kick.useMutation({
    onError: failure,
    onSettled: settled,
  });

  function askUndo() {
    setConfirm({
      title: knockoutOnly
        ? UNDO_KNOCKOUT_DRAW_CONFIRM_TITLE
        : UNDO_POOL_DRAW_CONFIRM_TITLE,
      description: knockoutOnly
        ? UNDO_KNOCKOUT_DRAW_CONFIRM_COPY
        : UNDO_POOL_DRAW_CONFIRM_COPY,
      confirmLabel: UNDO_POOL_DRAW_CONFIRM_LABEL,
      onConfirm: () => undo.mutate({ gameId }),
    });
  }

  function askKick(request: GameKickRequest) {
    if (!game) {
      return;
    }
    const target = gameKickTarget(game, request);
    const copy = gameKickConfirmCopy(target, {
      partnerRequired: false,
      drawPosted: Boolean(game.drawPostedAt),
    });
    setConfirm({
      title: copy.title,
      description: copy.description,
      confirmLabel: KICK_ACTION,
      onConfirm: () =>
        kick.mutate(
          target.kind === "player"
            ? { gameId, userId: target.userId }
            : { gameId, waitlistId: target.waitlistId },
          { onSuccess: () => toast.show(kickedToast(target.name)) },
        ),
    });
  }

  function openRounds() {
    updateRounds.reset();
    setRoundCount(game?.roundCount ?? null);
    setSheet("rounds");
  }

  function open(next: "merge" | "draw") {
    merge.reset();
    draw.reset();
    post.reset();
    setSheet(next);
  }

  function openWalkover(place: KnockoutMatchPlace) {
    cancelMatch.reset();
    setSheet({ walkover: place });
  }

  const handlers: OrganizerCardHandlers = {
    knockoutOnly,
    undoPending: undo.isPending,
    kickPending: kick.isPending,
    onOpenMerge: () => open("merge"),
    onOpenDraw: () => open("draw"),
    onOpenRounds: openRounds,
    onUndo: askUndo,
    onKickPlayer: (userId) => askKick({ userId }),
    onKickWaitlist: (waitlistId) => askKick({ waitlistId }),
  };

  const sheets: Omit<OrganizerSheetsProps, "game"> = {
    knockoutOnly,
    sheet,
    onClose: () => setSheet(null),
    roundCount,
    onRoundCountChange: setRoundCount,
    pending: {
      merge: merge.isPending,
      draw: draw.isPending,
      post: post.isPending,
      rounds: updateRounds.isPending,
      walkover: cancelMatch.isPending,
    },
    errors: {
      merge: merge.error?.message ?? null,
      draw: draw.error?.message ?? post.error?.message ?? null,
      rounds: updateRounds.error?.message ?? null,
      walkover: cancelMatch.error?.message ?? null,
    },
    onMerge: (input) => merge.mutate({ gameId, ...input }),
    onDraw: () => {
      post.reset();
      draw.mutate({ gameId });
    },
    onPost: () => {
      draw.reset();
      post.mutate({ gameId });
    },
    onSaveRounds: () => {
      updateRounds.reset();
      updateRounds.mutate({ gameId, roundCount });
    },
    onWalkover: (matchId, advancingGameTeamId) =>
      cancelMatch.mutate({ gameId, matchId, advancingGameTeamId }),
  };

  return {
    handlers,
    sheets,
    openWalkover,
    confirmPending: undo.isPending || kick.isPending,
  };
}
