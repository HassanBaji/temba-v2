"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  CHANGES_SAVED_TOAST,
  gameEditChangeNote,
  gameEditChangedSections,
  gameEditDraftFrom,
  gameEditPlan,
  gameEditSeasonFix,
  type GameEditDraft,
  type GameEditSections,
  type GameEditSource,
  type GameEditStep,
} from "@repo/domain/game-edit-form";
import type { GroupSeasonData } from "@repo/domain/group-season";
import { api } from "~/trpc/react";

export type GameEditField = GameEditStep["kind"];

export type GameEditError = { field: GameEditField | null; message: string };

const STEP_LABEL: Record<GameEditField, string> = {
  name: "Name",
  window: "When",
  caps: "Players",
  price: "Price",
  level: "Level range",
  rounds: "Rounds",
  season: "Season",
};

export function movedToWaitlistToast(count: number) {
  return count === 1
    ? "1 player moved to the waiting list"
    : `${count} players moved to the waiting list`;
}

/**
 * The Edit game sheet's state: one draft, one Save that sends the changed
 * sections in order. A step that fails stops the run; the Game reloads with
 * what did save, the draft keeps the rest, and the error names the section.
 */
export function useGameEdit({
  gameId,
  game,
  sections,
  seasons,
  open,
  onSaved,
  onClose,
}: {
  gameId: string;
  game: GameEditSource;
  sections: GameEditSections;
  seasons: readonly GroupSeasonData[];
  open: boolean;
  onSaved: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [now] = React.useState(() => new Date());
  const saved = React.useMemo(() => gameEditDraftFrom(game), [game]);
  const [draft, setDraft] = React.useState<GameEditDraft>(saved);
  const [error, setError] = React.useState<GameEditError | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setDraft(saved);
      setError(null);
    }
  }, [open, saved]);

  const updateName = api.games.updateName.useMutation();
  const updateWindow = api.games.updateWindow.useMutation();
  const updateCaps = api.games.updateCaps.useMutation();
  const updatePrice = api.games.updatePricePerPlayer.useMutation();
  const updateLevel = api.games.updateLevelRange.useMutation();
  const updateRounds = api.games.updateRoundCount.useMutation();
  const updateSeason = api.games.updateSeason.useMutation();

  async function runStep(step: GameEditStep): Promise<number> {
    switch (step.kind) {
      case "name":
        await updateName.mutateAsync({ gameId, customName: step.customName });
        return 0;
      case "window":
        await updateWindow.mutateAsync({
          gameId,
          name: step.name,
          windowStart: step.windowStart,
          windowEnd: step.windowEnd,
          ...(step.seasonId !== undefined ? { seasonId: step.seasonId } : {}),
        });
        return 0;
      case "caps": {
        const result = await updateCaps.mutateAsync({
          gameId,
          playersAllowed: step.playersAllowed,
          sideSize: step.sideSize,
        });
        return result.movedToWaitlist.length;
      }
      case "price":
        await updatePrice.mutateAsync({
          gameId,
          pricePerPlayerFils: step.pricePerPlayerFils,
        });
        return 0;
      case "level":
        await updateLevel.mutateAsync({
          gameId,
          levelMinTenths: step.levelMinTenths,
          levelMaxTenths: step.levelMaxTenths,
        });
        return 0;
      case "rounds":
        await updateRounds.mutateAsync({ gameId, roundCount: step.roundCount });
        return 0;
      case "season":
        await updateSeason.mutateAsync({ gameId, seasonId: step.seasonId });
        return 0;
    }
  }

  const seasonFix = sections.season
    ? gameEditSeasonFix(draft, seasons, now)
    : null;
  const changed = gameEditChangedSections(saved, draft, sections);
  const note = gameEditChangeNote(saved, draft, sections, {
    seasonNeedsFix: seasonFix != null,
  });
  const canSave = changed.length > 0 && seasonFix == null && !pending;

  function update(patch: Partial<GameEditDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  async function save() {
    if (!canSave) {
      return;
    }
    const plan = gameEditPlan(saved, draft, sections);
    if (!plan.ok) {
      setError({ field: plan.field, message: plan.message });
      return;
    }
    setPending(true);
    setError(null);
    let moved = 0;
    let failed: GameEditError | null = null;
    for (const step of plan.steps) {
      try {
        moved += await runStep(step);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Something went wrong";
        failed = { field: step.kind, message };
        break;
      }
    }
    await onSaved();
    setPending(false);
    if (failed) {
      setError(failed);
      toast.error(`${STEP_LABEL[failed.field ?? "name"]}: ${failed.message}`);
      return;
    }
    toast.success(CHANGES_SAVED_TOAST);
    if (moved > 0) {
      toast.success(movedToWaitlistToast(moved));
    }
    onClose();
  }

  return {
    now,
    saved,
    draft,
    update,
    changed,
    note,
    seasonFix,
    error,
    pending,
    canSave,
    save,
  };
}

export type GameEditController = ReturnType<typeof useGameEdit>;
