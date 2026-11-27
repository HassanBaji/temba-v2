import {
  friendlyGameDetailsPlan,
  type FriendlyGameDetails,
} from "@repo/domain/friendly-game-details";
import {
  scoreReviewView,
  type ScoreChangeReason,
  type ScoreReviewActionKind,
  type ScoreReviewBar,
} from "@repo/domain/score-review";
import { useEffect, useState } from "react";

import { useLocale } from "../i18n/locale-provider";
import {
  draftSetGames,
  draftsFromSets,
  draftsOutOfRange,
  setsToSave,
  withDraftChange,
  type ScoreDrafts,
} from "./details-model";

type DraftSet = Parameters<typeof withDraftChange>[1];

export type ScoreReview = {
  /** A score is in and waits to be confirmed: the boxes are read-only. */
  active: boolean;
  editing: boolean;
  drafts: ScoreDrafts;
  reason: ScoreChangeReason | null;
  changedSetNumbers: number[];
  bar: ScoreReviewBar | null;
  pending: boolean;
  onChangeDraft: (set: DraftSet, sideIndex: number, text: string) => void;
  onToggleReason: (reason: ScoreChangeReason) => void;
  onAction: (kind: ScoreReviewActionKind) => void;
};

/**
 * The confirm-or-dispute flow of an entered padel score (ADR-0115), shared
 * by the score card, which shows the boxes and the reason, and the bottom
 * bar, which holds the actions.
 */
export function useScoreReview({
  game,
  pending,
  onConfirm,
  onSend,
}: {
  game: FriendlyGameDetails | null;
  pending: boolean;
  onConfirm: () => void;
  onSend: (
    sets: ReturnType<typeof setsToSave>,
    reason: ScoreChangeReason | null,
  ) => Promise<boolean>;
}): ScoreReview {
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<ScoreDrafts>({});
  const [reason, setReason] = useState<ScoreChangeReason | null>(null);

  const plan = game ? friendlyGameDetailsPlan(game) : null;
  const match = plan?.firstMatch ?? null;
  const phase = game?.phase && game.phase !== "cancelled" ? game.phase : null;
  const view = scoreReviewView(
    {
      phase,
      match,
      confirmation: game?.matchResultConfirmation ?? null,
      confirmWindow: game?.confirmWindow,
      viewerUserId: game?.viewerUserId ?? "",
      viewerGameTeamId: plan?.viewerGameTeamId ?? null,
      draftSets: editing && match ? draftSetGames(match.sets, drafts) : null,
      draftValid: !draftsOutOfRange(drafts),
    },
    locale,
  );

  useEffect(() => {
    if (!view.active) {
      setEditing(false);
    }
  }, [view.active]);

  const stopEditing = () => {
    setEditing(false);
    setReason(null);
  };

  return {
    active: view.active,
    editing: view.active && editing,
    drafts,
    reason,
    changedSetNumbers: view.changedSetNumbers,
    bar: view.bar,
    pending,
    onChangeDraft: (set, sideIndex, text) =>
      setDrafts((current) => withDraftChange(current, set, sideIndex, text)),
    onToggleReason: (next) =>
      setReason((current) => (current === next ? null : next)),
    onAction: (kind) => {
      if (!match) {
        return;
      }
      if (kind === "confirm") {
        onConfirm();
      } else if (kind === "edit") {
        setDrafts(draftsFromSets(match.sets));
        setReason(null);
        setEditing(true);
      } else if (kind === "cancel") {
        stopEditing();
      } else {
        void onSend(setsToSave(match.sets, drafts), reason).then((sent) => {
          if (sent) {
            stopEditing();
          }
        });
      }
    },
  };
}
