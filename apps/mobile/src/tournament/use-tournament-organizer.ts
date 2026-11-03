import { gameToast, kickAction, kickedToast } from "@repo/domain/game-copy";
import {
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRequest,
} from "@repo/domain/game-kick-confirm";
import type { TournamentDetails } from "@repo/domain/tournament-details";
import type { KnockoutMatchPlace } from "@repo/domain/tournament-knockout-view";
import { isKnockoutOnly } from "@repo/domain/tournament-rounds";
import { useState } from "react";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import { useLocale, useMessages } from "../i18n/locale-provider";
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
  const locale = useLocale();
  const m = useMessages();
  const knockoutOnly =
    game != null && isKnockoutOnly(game.format, game.tournamentShape);
  const [sheet, setSheet] = useState<TournamentSheet>(null);
  const [roundCount, setRoundCount] = useState<number | null>(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);

  const failure = (error: { message: string }) => toast.show(error.message);
  const settled = async () => {
    setConfirm(null);
    await refresh();
  };

  const merge = api.games.mergeHalfTeams.useMutation({
    onSuccess: () => {
      toast.show(gameToast(locale).halfTeamsMerged);
      setSheet(null);
    },
    onSettled: refresh,
  });
  const draw = api.games.drawPools.useMutation({
    onSuccess: () => toast.show(drawToast("drawn", knockoutOnly, locale)),
    onSettled: refresh,
  });
  const post = api.games.postPoolDraw.useMutation({
    onSuccess: () => {
      toast.show(drawToast("posted", knockoutOnly, locale));
      setSheet(null);
    },
    onSettled: refresh,
  });
  const undo = api.games.undoPoolDraw.useMutation({
    onSuccess: () => toast.show(drawToast("undone", knockoutOnly, locale)),
    onError: failure,
    onSettled: settled,
  });
  const updateRounds = api.games.updateRoundCount.useMutation({
    onSuccess: () => {
      toast.show(m.mobileTournament.organizer.roundsSaved);
      setSheet(null);
    },
    onSettled: refresh,
  });
  const cancelMatch = api.games.cancelMatch.useMutation({
    onSuccess: (result) => {
      const toasts = gameToast(locale);
      toast.show(
        result.cancelledGame ? toasts.gameCancelled : toasts.matchCancelled,
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
    const poolDraw = m.tournament.poolDraw;
    setConfirm({
      title: knockoutOnly
        ? poolDraw.undoKnockoutConfirmTitle
        : poolDraw.undoConfirmTitle,
      description: knockoutOnly
        ? poolDraw.undoKnockoutConfirmCopy
        : poolDraw.undoConfirmCopy,
      confirmLabel: poolDraw.undoConfirmLabel,
      onConfirm: () => undo.mutate({ gameId }),
    });
  }

  function askKick(request: GameKickRequest) {
    if (!game) {
      return;
    }
    const target = gameKickTarget(game, request, locale);
    const copy = gameKickConfirmCopy(
      target,
      {
        partnerRequired: false,
        drawPosted: Boolean(game.drawPostedAt),
      },
      locale,
    );
    setConfirm({
      title: copy.title,
      description: copy.description,
      confirmLabel: kickAction(locale),
      onConfirm: () =>
        kick.mutate(
          target.kind === "player"
            ? { gameId, userId: target.userId }
            : { gameId, waitlistId: target.waitlistId },
          { onSuccess: () => toast.show(kickedToast(target.name, locale)) },
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
    onAddPlayer: () => setAddPlayerOpen(true),
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
    addPlayer: {
      open: addPlayerOpen,
      onClose: () => setAddPlayerOpen(false),
    },
    confirmPending: undo.isPending || kick.isPending,
  };
}
