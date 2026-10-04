import type { FriendlyGameFooterActionKind } from "@repo/domain/friendly-game-actions";
import {
  friendlyGameOrganizerPlan,
  type FriendlyGameOrganizerInput,
} from "@repo/domain/friendly-game-organizer";
import {
  CANCEL_GAME_ACTION,
  COMPLETE_MATCH_ACTION,
  COMPLETE_MATCH_CONSEQUENCE,
  GAME_TOAST,
  KICK_ACTION,
  MARK_AS_NOT_PLAYED_ACTION,
  MARK_AS_NOT_PLAYED_CONSEQUENCE,
  REPORT_WRONG_SCORE_ACTION,
  REPORT_WRONG_SCORE_CONSEQUENCE,
  cancelGameConsequence,
  kickedToast,
} from "@repo/domain/game-copy";
import { occupiedFriendlyPositions } from "@repo/domain/game-invite-open-graph";
import {
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRequest,
} from "@repo/domain/game-kick-confirm";
import { useMemo, useState } from "react";

import { slotOf } from "../lib/slot-of";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import type { ConfirmRequest } from "./confirm-sheet";
import { gameTitle } from "./details-model";
import type { OrganizerHandlers } from "./organizer-card";
import type { EditSection, OrganizerSheetsProps } from "./organizer-sheets";

type Options = {
  gameId: string;
  game: FriendlyGameOrganizerInput | null;
  partnerRequired: boolean;
  refresh: () => Promise<unknown>;
  setConfirm: (request: ConfirmRequest | null) => void;
};

export function useOrganizerActions({
  gameId,
  game,
  partnerRequired,
  refresh,
  setConfirm,
}: Options) {
  const toast = useToast();
  const utils = api.useUtils();
  const [section, setSection] = useState<EditSection | null>(null);
  const [now] = useState(() => new Date());
  const plan = useMemo(
    () => (game ? friendlyGameOrganizerPlan(game) : null),
    [game],
  );

  const refreshRatings = async () => {
    await utils.ratings.me.invalidate();
    await utils.users.profileStats.invalidate();
  };
  const failure = (error: { message: string }) => toast.show(error.message);
  const settled = async () => {
    setConfirm(null);
    await refresh();
  };

  const closeRegistration = api.games.closeRegistration.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.registrationClosed),
    onError: failure,
    onSettled: refresh,
  });
  const reopenRegistration = api.games.reopenRegistration.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.registrationReopened),
    onError: failure,
    onSettled: refresh,
  });
  const kick = api.games.kick.useMutation({
    onError: failure,
    onSettled: settled,
  });
  const cancelGame = api.games.cancel.useMutation({
    onSuccess: () => toast.show(GAME_TOAST.gameCancelled),
    onError: failure,
    onSettled: settled,
  });
  const cancelMatch = api.games.cancelMatch.useMutation({
    onSuccess: (result) =>
      toast.show(
        result.cancelledGame
          ? GAME_TOAST.gameCancelled
          : GAME_TOAST.matchCancelled,
      ),
    onError: failure,
    onSettled: settled,
  });
  const reportWrongScore = api.games.reportWrongScore.useMutation({
    onSuccess: () => toast.show("Score reopened"),
    onError: failure,
    onSettled: async () => {
      await settled();
      await refreshRatings();
    },
  });
  const completeMatch = api.games.completeMatch.useMutation({
    onSuccess: () => toast.show("Match completed"),
    onError: failure,
    onSettled: async () => {
      await settled();
      await refreshRatings();
    },
  });
  const approve = api.games.approveLevelRangeRequest.useMutation({
    onSuccess: () => toast.show("Request approved"),
    onError: failure,
    onSettled: refresh,
  });
  const reject = api.games.rejectLevelRangeRequest.useMutation({
    onSuccess: () => toast.show("Request rejected"),
    onError: failure,
    onSettled: refresh,
  });
  const updateWindow = api.games.updateWindow.useMutation({
    onSuccess: () => {
      toast.show("Window saved");
      setSection("menu");
    },
    onSettled: refresh,
  });
  const updatePrice = api.games.updatePricePerPlayer.useMutation({
    onSuccess: () => {
      toast.show("Price per player saved");
      setSection("menu");
    },
    onSettled: refresh,
  });
  const updateLevel = api.games.updateLevelRange.useMutation({
    onSuccess: () => {
      toast.show("Level range saved");
      setSection("menu");
    },
    onSettled: refresh,
  });
  const updateMatch = api.games.updateMatch.useMutation({
    onSuccess: () => {
      toast.show("Match updated");
      setSection(null);
    },
    onSettled: refresh,
  });

  const courts = api.games.listCourts.useQuery(
    { gameId },
    { enabled: plan != null && section === "court" },
  );

  const title = gameTitle(game?.name ?? null);
  const firstMatchId = game?.matches[0]?.id;

  function askKick(request: GameKickRequest) {
    if (!game) {
      return;
    }
    const target = gameKickTarget(game, request);
    const copy = gameKickConfirmCopy(target, {
      partnerRequired,
      drawPosted: false,
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

  function askCompleteMatch(matchId: string) {
    setConfirm({
      title: "Complete Match and update ratings?",
      description: COMPLETE_MATCH_CONSEQUENCE,
      confirmLabel: COMPLETE_MATCH_ACTION,
      onConfirm: () => completeMatch.mutate({ gameId, matchId }),
    });
  }

  function onFooterAction(kind: FriendlyGameFooterActionKind) {
    if (!game) {
      return false;
    }
    switch (kind) {
      case "edit":
        setSection("menu");
        return true;
      case "cancel_game":
        setConfirm({
          title: `Cancel ${title}?`,
          description: cancelGameConsequence(
            occupiedFriendlyPositions(game.sides),
          ),
          confirmLabel: CANCEL_GAME_ACTION,
          onConfirm: () => cancelGame.mutate({ gameId }),
        });
        return true;
      case "mark_as_not_played":
        setConfirm({
          title: "Mark as not played?",
          description: MARK_AS_NOT_PLAYED_CONSEQUENCE,
          confirmLabel: MARK_AS_NOT_PLAYED_ACTION,
          onConfirm: () =>
            firstMatchId &&
            cancelMatch.mutate({ gameId, matchId: firstMatchId }),
        });
        return true;
      case "report_wrong_score":
        setConfirm({
          title: "Report a wrong score?",
          description: REPORT_WRONG_SCORE_CONSEQUENCE,
          confirmLabel: REPORT_WRONG_SCORE_ACTION,
          onConfirm: () =>
            firstMatchId &&
            reportWrongScore.mutate({ gameId, matchId: firstMatchId }),
        });
        return true;
      default:
        return false;
    }
  }

  const footerPendingKind: FriendlyGameFooterActionKind | null =
    cancelGame.isPending
      ? "cancel_game"
      : cancelMatch.isPending
        ? "mark_as_not_played"
        : reportWrongScore.isPending
          ? "report_wrong_score"
          : null;

  const handlers: OrganizerHandlers = {
    registrationPending:
      closeRegistration.isPending || reopenRegistration.isPending,
    completePending: completeMatch.isPending,
    decidingRequestId: approve.isPending
      ? (approve.variables?.requestId ?? null)
      : reject.isPending
        ? (reject.variables?.requestId ?? null)
        : null,
    onToggleRegistration: () =>
      plan?.registration === "reopen"
        ? reopenRegistration.mutate({ gameId })
        : closeRegistration.mutate({ gameId }),
    onChooseCourt: () => setSection("court"),
    onComplete: askCompleteMatch,
    onApprove: (requestId) => approve.mutate({ requestId }),
    onReject: (requestId) => reject.mutate({ requestId }),
    onKickWaitlist: (waitlistId) => askKick({ waitlistId }),
    onKickPlayer: (userId) => askKick({ userId }),
  };

  const sheets: Omit<OrganizerSheetsProps, "game"> = {
    section,
    onSection: setSection,
    courtId:
      game?.matches.find((match) => match.id === plan?.court?.matchId)
        ?.courtId ?? null,
    courts: slotOf(courts),
    now,
    pending: {
      window: updateWindow.isPending,
      price: updatePrice.isPending,
      level: updateLevel.isPending,
      court: updateMatch.isPending,
    },
    errors: {
      window: updateWindow.error?.message ?? null,
      price: updatePrice.error?.message ?? null,
      level: updateLevel.error?.message ?? null,
      court: updateMatch.error?.message ?? null,
    },
    onSaveWindow: (input) => {
      updateWindow.reset();
      updateWindow.mutate({ gameId, ...input });
    },
    onSavePrice: (fils) => {
      updatePrice.reset();
      updatePrice.mutate({ gameId, pricePerPlayerFils: fils });
    },
    onSaveLevel: (input) => {
      updateLevel.reset();
      updateLevel.mutate({ gameId, ...input });
    },
    onChooseCourt: (courtId) => {
      const matchId = plan?.court?.matchId;
      if (matchId) {
        updateMatch.reset();
        updateMatch.mutate({ gameId, matchId, courtId });
      }
    },
  };

  return {
    plan,
    handlers,
    sheets,
    footerPendingKind,
    onFooterAction,
    askKick,
    confirmPending:
      kick.isPending ||
      cancelGame.isPending ||
      cancelMatch.isPending ||
      reportWrongScore.isPending ||
      completeMatch.isPending,
  };
}
