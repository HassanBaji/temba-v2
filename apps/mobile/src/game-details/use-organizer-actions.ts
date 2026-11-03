import type { FriendlyGameFooterActionKind } from "@repo/domain/friendly-game-actions";
import {
  friendlyGameOrganizerPlan,
  type FriendlyGameOrganizerInput,
} from "@repo/domain/friendly-game-organizer";
import {
  cancelGameAction,
  cancelGameConsequence,
  completeMatchAction,
  completeMatchConsequence,
  gameToast,
  kickAction,
  kickedToast,
  markAsNotPlayedAction,
  markAsNotPlayedConsequence,
  reportWrongScoreAction,
  reportWrongScoreConsequence,
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

import { useLocale, useMessages } from "../i18n/locale-provider";
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
  const m = useMessages();
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const [section, setSection] = useState<EditSection | null>(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const plan = useMemo(
    () => (game ? friendlyGameOrganizerPlan(game, locale) : null),
    [game, locale],
  );
  const toasts = gameToast(locale);
  const copy = m.mobileGameDetails;
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
    onSuccess: () => toast.show(toasts.registrationClosed),
    onError: failure,
    onSettled: refresh,
  });
  const reopenRegistration = api.games.reopenRegistration.useMutation({
    onSuccess: () => toast.show(toasts.registrationReopened),
    onError: failure,
    onSettled: refresh,
  });
  const kick = api.games.kick.useMutation({
    onError: failure,
    onSettled: settled,
  });
  const cancelGame = api.games.cancel.useMutation({
    onSuccess: () => toast.show(toasts.gameCancelled),
    onError: failure,
    onSettled: settled,
  });
  const cancelMatch = api.games.cancelMatch.useMutation({
    onSuccess: (result) =>
      toast.show(
        result.cancelledGame ? toasts.gameCancelled : toasts.matchCancelled,
      ),
    onError: failure,
    onSettled: settled,
  });
  const reportWrongScore = api.games.reportWrongScore.useMutation({
    onSuccess: () => toast.show(copy.toast.scoreReopened),
    onError: failure,
    onSettled: async () => {
      await settled();
      await refreshRatings();
    },
  });
  const completeMatch = api.games.completeMatch.useMutation({
    onSuccess: () => toast.show(copy.toast.matchCompleted),
    onError: failure,
    onSettled: async () => {
      await settled();
      await refreshRatings();
    },
  });
  const approve = api.games.approveLevelRangeRequest.useMutation({
    onSuccess: () => toast.show(copy.toast.requestApproved),
    onError: failure,
    onSettled: refresh,
  });
  const reject = api.games.rejectLevelRangeRequest.useMutation({
    onSuccess: () => toast.show(copy.toast.requestRejected),
    onError: failure,
    onSettled: refresh,
  });
  const updateMatch = api.games.updateMatch.useMutation({
    onSuccess: () => {
      toast.show(copy.toast.matchUpdated);
      setSection(null);
    },
    onSettled: refresh,
  });

  const courts = api.games.listCourts.useQuery(
    { gameId },
    { enabled: plan != null && section === "court" },
  );

  const title = gameTitle(game?.name ?? null, locale);
  const firstMatchId = game?.matches[0]?.id;

  function askKick(request: GameKickRequest) {
    if (!game) {
      return;
    }
    const target = gameKickTarget(game, request);
    const kickCopy = gameKickConfirmCopy(
      target,
      { partnerRequired, drawPosted: false },
      locale,
    );
    setConfirm({
      title: kickCopy.title,
      description: kickCopy.description,
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

  function askCompleteMatch(matchId: string) {
    setConfirm({
      title: copy.confirm.completeMatchTitle,
      description: completeMatchConsequence(locale),
      confirmLabel: completeMatchAction(locale),
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
          title: copy.confirm.cancelTitle(title),
          description: cancelGameConsequence(
            occupiedFriendlyPositions(game.sides),
            locale,
          ),
          confirmLabel: cancelGameAction(locale),
          onConfirm: () => cancelGame.mutate({ gameId }),
        });
        return true;
      case "mark_as_not_played":
        setConfirm({
          title: copy.confirm.markAsNotPlayedTitle,
          description: markAsNotPlayedConsequence(locale),
          confirmLabel: markAsNotPlayedAction(locale),
          onConfirm: () =>
            firstMatchId &&
            cancelMatch.mutate({ gameId, matchId: firstMatchId }),
        });
        return true;
      case "report_wrong_score":
        setConfirm({
          title: copy.confirm.reportWrongScoreTitle,
          description: reportWrongScoreConsequence(locale),
          confirmLabel: reportWrongScoreAction(locale),
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
