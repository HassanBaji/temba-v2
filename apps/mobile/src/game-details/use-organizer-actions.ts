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
import {
  gameEditSectionsFor,
  type GameEditSource,
} from "@repo/domain/game-edit-form";
import { useMemo, useState } from "react";

import { slotOf } from "../lib/slot-of";
import { useToast } from "../primitives/toast";
import { api, type RouterOutputs } from "../trpc/react";
import type { ConfirmRequest } from "./confirm-sheet";
import { gameTitle } from "./details-model";
import type { OrganizerHandlers } from "./organizer-card";
import type { EditSection, OrganizerSheetsProps } from "./organizer-sheets";
import { useGameEdit } from "./use-game-edit";

type EditGame = RouterOutputs["games"]["byId"];

type Options = {
  gameId: string;
  game: (FriendlyGameOrganizerInput & EditGame) | null;
  partnerRequired: boolean;
  refresh: () => Promise<unknown>;
  setConfirm: (request: ConfirmRequest | null) => void;
};

const EMPTY_EDIT_SOURCE: GameEditSource = {
  name: null,
  hasCustomName: false,
  windowStart: null,
  windowEnd: null,
  pricePerPlayerFils: null,
  playersAllowed: null,
  sideSize: null,
  levelMinTenths: null,
  levelMaxTenths: null,
  roundCount: null,
  seasonId: null,
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
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const plan = useMemo(
    () => (game ? friendlyGameOrganizerPlan(game) : null),
    [game],
  );
  const editSections = gameEditSectionsFor({
    format: game?.format ?? "friendly_game",
    sport: game?.sport,
    groupId: game?.groupId ?? null,
    tournamentRounds: false,
  });
  const edit = useGameEdit({
    gameId,
    game: game ?? EMPTY_EDIT_SOURCE,
    sections: editSections,
    seasons: game?.groupSeasons ?? [],
    open: section === "edit",
    onSaved: refresh,
    onClose: () => setSection(null),
  });

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
        setSection("edit");
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
    onAddPlayer: () => setAddPlayerOpen(true),
  };

  const sheets: OrganizerSheetsProps = {
    section,
    onSection: setSection,
    edit,
    editSections,
    editContext: {
      venueName: game?.venue?.name ?? null,
      courtName: game?.recordedCourts[0]?.name ?? null,
      groupName: game?.groupName ?? null,
      joined: game?.registeredUserCount ?? 0,
      seasons: game?.groupSeasons ?? [],
      canChangeSeason: game?.canChangeSeason ?? false,
    },
    courtId:
      game?.matches.find((match) => match.id === plan?.court?.matchId)
        ?.courtId ?? null,
    courts: slotOf(courts),
    courtPending: updateMatch.isPending,
    courtError: updateMatch.error?.message ?? null,
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
    addPlayer: {
      open: addPlayerOpen && plan != null,
      onClose: () => setAddPlayerOpen(false),
    },
    confirmPending:
      kick.isPending ||
      cancelGame.isPending ||
      cancelMatch.isPending ||
      reportWrongScore.isPending ||
      completeMatch.isPending,
  };
}
