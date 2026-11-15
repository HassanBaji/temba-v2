import { gameToast, kickAction, kickedToast } from "@repo/domain/game-copy";
import {
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRequest,
} from "@repo/domain/game-kick-confirm";
import type { TournamentDetails } from "@repo/domain/tournament-details";
import type { KnockoutMatchPlace } from "@repo/domain/tournament-knockout-view";
import { roundCancelCopy } from "@repo/domain/tournament-round-state";
import { hasPools, isKnockoutOnly } from "@repo/domain/tournament-rounds";
import { useState } from "react";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api, type RouterOutputs } from "../trpc/react";
import type { OrganizerSheetsProps } from "./organizer-sheets";
import type { OrganizerCardHandlers } from "./organizer-card";
import { drawToast } from "./organizer-model";

type Options = {
  gameId: string;
  game: TournamentDetails | null;
  refresh: () => Promise<unknown>;
  setConfirm: (request: ConfirmRequest | null) => void;
  onEdit?: () => void;
};

export type PostedRound =
  RouterOutputs["games"]["tournamentRounds"]["rounds"][number];

export type TournamentSheet =
  | "merge"
  | "draw"
  | "rounds"
  | "cancelRound"
  | { walkover: KnockoutMatchPlace }
  | null;

export function useTournamentOrganizer({
  gameId,
  game,
  refresh,
  setConfirm,
  onEdit,
}: Options) {
  const toast = useToast();
  const locale = useLocale();
  const m = useMessages();
  const knockoutOnly =
    game != null && isKnockoutOnly(game.format, game.tournamentShape);
  const [sheet, setSheet] = useState<TournamentSheet>(null);
  const [roundCount, setRoundCount] = useState<number | null>(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [editTeamsOpen, setEditTeamsOpen] = useState(false);

  const failure = (error: { message: string }) => toast.show(error.message);
  const settled = async () => {
    setConfirm(null);
    await refresh();
  };

  // Rounds change after the draw only on a Pool tournament, and only for its Organizer.
  const managesRounds =
    game != null &&
    game.isOrganizer &&
    game.drawPostedAt != null &&
    game.cancelledAt == null &&
    hasPools(game.format, game.poolCount);
  const utils = api.useUtils();
  const postedRounds = api.games.tournamentRounds.useQuery(
    { gameId },
    { enabled: managesRounds },
  );
  const roundsSettled = async () => {
    setConfirm(null);
    await Promise.all([
      refresh(),
      utils.games.tournamentRounds.invalidate({ gameId }),
    ]);
  };
  const addRound = api.games.addRound.useMutation({
    onSuccess: (added) =>
      toast.show(m.tournamentRounds.manage.added(added.roundCount)),
    onError: failure,
    onSettled: roundsSettled,
  });
  const cancelRound = api.games.cancelRound.useMutation({
    onError: failure,
    onSettled: roundsSettled,
  });

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

  function askAddRound() {
    const round = (postedRounds.data?.roundCount ?? 0) + 1;
    const copy = m.tournamentRounds.manage;
    setConfirm({
      title: copy.addTitle,
      description: copy.addCopy(round),
      confirmLabel: copy.addConfirm(round),
      cancelLabel: m.common.cancel,
      onConfirm: () => addRound.mutate({ gameId, post: true }),
    });
  }

  function askCancelRound(round: PostedRound) {
    const copy = m.tournamentRounds.manage;
    setSheet(null);
    setConfirm({
      title: copy.cancelTitle(round.roundNumber),
      description: roundCancelCopy(
        round,
        postedRounds.data?.roundCount ?? round.roundNumber,
        locale,
      ),
      confirmLabel: copy.cancel(round.roundNumber),
      cancelLabel: copy.keep,
      onConfirm: () =>
        cancelRound.mutate(
          { gameId, roundNumber: round.roundNumber },
          {
            onSuccess: () => toast.show(copy.cancelled(round.roundNumber)),
          },
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
    onEditTeams: () => setEditTeamsOpen(true),
    onEdit:
      onEdit && game?.isOrganizer && game.cancelledAt == null ? onEdit : null,
    postedRounds:
      managesRounds && postedRounds.data
        ? {
            roundCount: postedRounds.data.roundCount,
            canAdd: postedRounds.data.canAddRound,
            canCancel: postedRounds.data.rounds.some(
              (round) => round.cancelEffect != null,
            ),
            addPending: addRound.isPending,
          }
        : null,
    onAddRound: askAddRound,
    onOpenCancelRound: () => setSheet("cancelRound"),
  };

  const sheets: Omit<OrganizerSheetsProps, "game"> = {
    knockoutOnly,
    sheet,
    onClose: () => setSheet(null),
    roundCount,
    onRoundCountChange: setRoundCount,
    postedRounds: postedRounds.data?.rounds ?? [],
    onCancelRound: askCancelRound,
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
      onOpen: () => setAddPlayerOpen(true),
      onClose: () => setAddPlayerOpen(false),
    },
    editTeams: {
      open: editTeamsOpen,
      onClose: () => setEditTeamsOpen(false),
    },
    confirmPending:
      undo.isPending ||
      kick.isPending ||
      addRound.isPending ||
      cancelRound.isPending,
  };
}
