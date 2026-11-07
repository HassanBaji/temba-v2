import {
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
import type { MvpMode } from "@repo/domain/marks";
import { useEffect, useMemo, useState } from "react";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { gameEditMvp, gameEditMvpChanged } from "./game-edit-mvp";

export type GameEditField = GameEditStep["kind"] | "mvp";

export type GameEditError = { field: GameEditField | null; message: string };

/**
 * The Edit game sheet's state: one draft, one Save that sends the changed
 * sections in order. A step that fails stops the run; the Game reloads with
 * what did save, the draft keeps the rest, and the error names the section.
 * The MVP mode saves last, through `marks.setMvpMode`, and only while the
 * Match is not completed (the marks window has not opened).
 */
export function useGameEdit({
  gameId,
  game,
  sections,
  seasons,
  open,
  mvpEnabled,
  onSaved,
  onClose,
}: {
  gameId: string;
  game: GameEditSource;
  sections: GameEditSections;
  seasons: readonly GroupSeasonData[];
  open: boolean;
  /** An Organizer on a Friendly game, the only Game with an MVP. */
  mvpEnabled: boolean;
  onSaved: () => Promise<unknown>;
  onClose: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const [now] = useState(() => new Date());
  const saved = useMemo(() => gameEditDraftFrom(game), [game]);
  const [draft, setDraft] = useState<GameEditDraft>(saved);
  const [error, setError] = useState<GameEditError | null>(null);
  const [pending, setPending] = useState(false);
  const [mvpPick, setMvpPick] = useState<MvpMode | null>(null);
  const marks = api.marks.forGame.useQuery({ gameId }, { enabled: mvpEnabled });
  const mvp = gameEditMvp(mvpEnabled ? marks.data : undefined, mvpPick);
  const mvpChanged = gameEditMvpChanged(mvp);

  useEffect(() => {
    if (!open) {
      setDraft(saved);
      setMvpPick(null);
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
  const setMvpMode = api.marks.setMvpMode.useMutation();

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
    ? gameEditSeasonFix(draft, seasons, now, locale)
    : null;
  const changed = gameEditChangedSections(saved, draft, sections);
  const note = gameEditChangeNote(saved, draft, sections, locale, {
    seasonNeedsFix: seasonFix != null,
    extraPhrases: mvpChanged ? [m.createGame.edit.change.mvp] : [],
  });
  const canSave =
    (changed.length > 0 || mvpChanged) && seasonFix == null && !pending;

  function update(patch: Partial<GameEditDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function pickMvpMode(mode: MvpMode) {
    setMvpPick(mode);
    setError(null);
  }

  async function save() {
    if (!canSave) {
      return;
    }
    const plan = gameEditPlan(saved, draft, sections, locale);
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
          caught instanceof Error
            ? caught.message
            : m.common.somethingWentWrong;
        failed = { field: step.kind, message };
        break;
      }
    }
    if (!failed && mvpChanged && mvp) {
      try {
        await setMvpMode.mutateAsync({ gameId, mode: mvp.picked });
      } catch (caught) {
        failed = {
          field: "mvp",
          message:
            caught instanceof Error
              ? caught.message
              : m.common.somethingWentWrong,
        };
      }
    }
    await Promise.all([
      onSaved(),
      mvpChanged ? utils.marks.forGame.invalidate({ gameId }) : null,
    ]);
    setPending(false);
    const copy = m.mobileGameDetails.edit;
    if (failed) {
      setError(failed);
      toast.show(
        copy.stepError(copy.step[failed.field ?? "name"], failed.message),
      );
      return;
    }
    toast.show(
      moved > 0
        ? copy.savedWithMoved(
            m.createGame.edit.changesSaved,
            copy.movedToWaitlist(moved),
          )
        : m.createGame.edit.changesSaved,
    );
    onClose();
  }

  return {
    now,
    saved,
    draft,
    update,
    mvp,
    pickMvpMode,
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
