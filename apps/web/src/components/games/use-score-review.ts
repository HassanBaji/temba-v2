"use client";

import * as React from "react";

import { friendlyGameDetailsPlan } from "@repo/domain/friendly-game-details";
import { friendlyGameResultsSaveSets } from "@repo/domain/friendly-game-results";
import {
  scoreReviewView,
  type ScoreChangeReason,
  type ScoreReviewActionKind,
  type ScoreReviewBar,
} from "@repo/domain/score-review";
import { useLocale } from "~/components/locale-provider";
import { type RouterOutputs } from "~/trpc/react";

type Game = RouterOutputs["games"]["byId"];
type Match = Game["matches"][number];

export type ScoreSetDraft = { slot1: number | null; slot2: number | null };
export type ScoreSetsToSave = ReturnType<typeof friendlyGameResultsSaveSets>;

export type ScoreReview = {
  /** A score is in and waits to be confirmed: the boxes are read-only. */
  active: boolean;
  editing: boolean;
  drafts: Record<string, ScoreSetDraft>;
  reason: ScoreChangeReason | null;
  bar: ScoreReviewBar | null;
  pending: boolean;
  onChangeDraft: (setId: string, draft: ScoreSetDraft) => void;
  onToggleReason: (reason: ScoreChangeReason) => void;
  onAction: (kind: ScoreReviewActionKind) => void;
};

function draftsOf(match: Match) {
  return Object.fromEntries(
    match.sets.map((set) => [
      set.id,
      { slot1: set.slot1GamesWon, slot2: set.slot2GamesWon },
    ]),
  );
}

/** A box left empty keeps the stored games, as it does when saved. */
function draftSets(match: Match, drafts: Record<string, ScoreSetDraft>) {
  return match.sets.map((set) => ({
    id: set.id,
    slot1: drafts[set.id]?.slot1 ?? set.slot1GamesWon,
    slot2: drafts[set.id]?.slot2 ?? set.slot2GamesWon,
  }));
}

/**
 * The confirm-or-dispute flow of an entered padel score (ADR-0115), shared
 * by the score section, which shows the boxes and the reason, and the
 * action bar, which holds the actions.
 */
export function useScoreReview({
  game,
  pending,
  onConfirm,
  onSend,
}: {
  game: Game | null;
  pending: boolean;
  onConfirm: () => void;
  onSend: (
    sets: ScoreSetsToSave,
    reason: ScoreChangeReason | null,
  ) => Promise<boolean>;
}): ScoreReview {
  const locale = useLocale();
  const [editing, setEditing] = React.useState(false);
  const [drafts, setDrafts] = React.useState<Record<string, ScoreSetDraft>>({});
  const [reason, setReason] = React.useState<ScoreChangeReason | null>(null);

  const plan = game ? friendlyGameDetailsPlan(game) : null;
  const match = plan?.firstMatch ?? null;
  const view = scoreReviewView(
    {
      phase: game?.phase && game.phase !== "cancelled" ? game.phase : null,
      match,
      confirmation: game?.matchResultConfirmation ?? null,
      confirmWindow: game?.confirmWindow,
      viewerUserId: game?.viewerUserId ?? "",
      viewerGameTeamId: plan?.viewerGameTeamId ?? null,
      draftSets:
        editing && match
          ? draftSets(match, drafts).map((set) => ({
              slot1GamesWon: set.slot1,
              slot2GamesWon: set.slot2,
            }))
          : null,
      draftValid: true,
    },
    locale,
  );

  React.useEffect(() => {
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
    bar: view.bar,
    pending,
    onChangeDraft: (setId, draft) =>
      setDrafts((current) => ({ ...current, [setId]: draft })),
    onToggleReason: (next) =>
      setReason((current) => (current === next ? null : next)),
    onAction: (kind) => {
      if (!match) {
        return;
      }
      if (kind === "confirm") {
        onConfirm();
      } else if (kind === "edit") {
        setDrafts(draftsOf(match));
        setReason(null);
        setEditing(true);
      } else if (kind === "cancel") {
        stopEditing();
      } else {
        void onSend(
          friendlyGameResultsSaveSets(draftSets(match, drafts)),
          reason,
        ).then((sent) => {
          if (sent) {
            stopEditing();
          }
        });
      }
    },
  };
}
