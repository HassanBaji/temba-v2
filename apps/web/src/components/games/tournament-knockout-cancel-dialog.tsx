"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { Button } from "~/components/ui/button";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { CANCEL_MATCH_ACTION } from "@repo/domain/game-copy";
import {
  knockoutCancelDescription,
  knockoutCancelPrompt,
  type KnockoutMatchPlace,
} from "@repo/domain/tournament-knockout-view";

const GOES_THROUGH_LABEL_ID = "knockout-cancel-goes-through";

export function TournamentKnockoutCancelDialog({
  place,
  onOpenChange,
  pending = false,
  onConfirm,
}: {
  place: KnockoutMatchPlace | null;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  onConfirm: (advancingGameTeamId: string | undefined) => Promise<void>;
}) {
  const [advancingGameTeamId, setAdvancingGameTeamId] = React.useState<
    string | null
  >(null);
  const [submitting, setSubmitting] = React.useState(false);
  const busy = pending || submitting;
  const prompt = place ? knockoutCancelPrompt(place) : null;
  const needsChoice = prompt?.kind === "choose";

  React.useEffect(() => {
    setAdvancingGameTeamId(null);
  }, [place?.matchId]);

  async function handleConfirm() {
    if (busy || (needsChoice && !advancingGameTeamId)) {
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(
        needsChoice ? (advancingGameTeamId ?? undefined) : undefined,
      );
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveDialog
      open={place != null}
      onOpenChange={(next) => {
        if (busy && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent showCloseButton={false}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {place ? `Cancel ${place.code}?` : `${CANCEL_MATCH_ACTION}?`}
          </ResponsiveDialogTitle>
          {prompt ? (
            <ResponsiveDialogDescription>
              {knockoutCancelDescription(prompt)}
            </ResponsiveDialogDescription>
          ) : null}
        </ResponsiveDialogHeader>
        {prompt?.kind === "choose" ? (
          <div className="space-y-2">
            <p id={GOES_THROUGH_LABEL_ID} className="text-body font-semibold">
              Goes through
            </p>
            <RovingRadioGroup
              aria-labelledby={GOES_THROUGH_LABEL_ID}
              className="flex flex-col gap-2"
            >
              {prompt.teams.map((team) => (
                <ChoiceChip
                  key={team.gameTeamId}
                  role="radio"
                  className="justify-start"
                  selected={advancingGameTeamId === team.gameTeamId}
                  disabled={busy}
                  onClick={() => setAdvancingGameTeamId(team.gameTeamId)}
                >
                  {team.name}
                </ChoiceChip>
              ))}
            </RovingRadioGroup>
          </div>
        ) : null}
        <ResponsiveDialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11"
            disabled={busy || (needsChoice && !advancingGameTeamId)}
            aria-busy={busy}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {busy ? `${CANCEL_MATCH_ACTION}…` : CANCEL_MATCH_ACTION}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
