"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { TierFish } from "~/components/groups/tier-fish";
import { useLocale, useMessages } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Hatch } from "~/components/ui/hatch";
import { Input } from "~/components/ui/input";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";
import type { LevelOverrideReason } from "@repo/domain/level-slider";
import {
  tierAdjustSheet,
  type TierAdjustMember,
} from "@repo/domain/tier-adjust";

const REASON_LABEL_ID = "adjust-tier-reason";
const NOTE_MAX = 140;

function AdjustTierForm({
  groupId,
  groupName,
  members,
  userId,
  image,
  onDone,
}: {
  groupId: string;
  groupName: string;
  members: readonly TierAdjustMember[];
  userId: string;
  image: string | null;
  onDone: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.rating.adjust;
  const [delta, setDelta] = React.useState(0);
  const [reason, setReason] = React.useState<LevelOverrideReason | null>(null);
  const [note, setNote] = React.useState("");
  const view = tierAdjustSheet({
    members,
    userId,
    delta,
    reason,
    groupName,
    locale,
  });
  const utils = api.useUtils();
  const adjust = api.groups.adjustTierPoints.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      if (view) {
        toast.success(view.savedToast);
      }
      await utils.groups.byId.invalidate({ id: groupId });
      onDone();
    },
  });
  if (!view) {
    return null;
  }
  const pending = adjust.isPending;

  return (
    <div className="flex flex-col gap-5 px-4 pb-4 md:px-0 md:pb-0">
      <div className="flex items-center gap-3">
        <UserAvatar name={view.name} image={image} className="size-10" />
        <div className="min-w-0">
          <p className="text-body truncate font-semibold">{view.name}</p>
          <p className="text-meta text-muted-foreground">{view.nowLine}</p>
        </div>
      </div>

      <div className="border-rule rounded-card flex flex-col gap-4 border p-4">
        <div className="flex gap-3" aria-live="polite">
          <div className="min-w-0 flex-1">
            <p className="text-eyebrow text-muted-foreground">
              {copy.newPoints}
            </p>
            <p className="flex items-baseline gap-2">
              <span className="font-expanded text-h1 font-bold tabular-nums">
                {view.pointsLabel}
              </span>
              <span className="text-meta text-muted-foreground tabular-nums">
                {view.deltaLabel}
              </span>
            </p>
          </div>
          <div className="text-end">
            <p className="text-eyebrow text-muted-foreground">{copy.place}</p>
            {view.placeLabel ? (
              <p className="font-expanded text-h1 font-bold tabular-nums">
                {view.placeLabel}
              </p>
            ) : (
              <Hatch className="ms-auto block h-[34px] w-11" />
            )}
            <p className="text-meta text-muted-foreground">{view.bandLabel}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {view.steps.map((step) => (
            <Button
              key={step.delta}
              type="button"
              variant="outline"
              className="min-h-11 tabular-nums"
              aria-label={step.accessibilityLabel}
              disabled={pending || step.disabled}
              onClick={() => setDelta(view.delta + step.delta)}
            >
              {step.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-meta text-muted-foreground">{copy.orJump}</span>
          {view.jumps.map((jump) => (
            <Button
              key={jump.band}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setDelta(jump.delta)}
            >
              {jump.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || view.delta === 0}
            onClick={() => setDelta(0)}
          >
            {copy.reset}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-meta text-muted-foreground">{copy.tierAfter}</p>
        <ul className="grid grid-cols-4" aria-label={copy.tierAfter}>
          {view.bands.map((band) => (
            <li
              key={band.band}
              aria-current={band.current ? "true" : undefined}
              className={cn(
                "flex flex-col items-center gap-1",
                band.current ? "opacity-100" : "opacity-20",
              )}
            >
              <TierFish band={band.band} label={band.label} />
              <span className="text-eyebrow">{band.label}</span>
            </li>
          ))}
        </ul>
        <p className="text-meta text-muted-foreground" aria-live="polite">
          {view.effect}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p id={REASON_LABEL_ID} className="text-meta text-muted-foreground">
          {view.why}
        </p>
        <RovingRadioGroup
          aria-labelledby={REASON_LABEL_ID}
          className="flex flex-wrap gap-2"
        >
          {view.reasons.map((option) => (
            <ChoiceChip
              key={option.value}
              role="radio"
              selected={option.selected}
              disabled={pending}
              onClick={() =>
                setReason(reason === option.value ? null : option.value)
              }
            >
              {option.label}
            </ChoiceChip>
          ))}
        </RovingRadioGroup>
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={copy.notePlaceholder}
          aria-label={copy.noteLabel}
          maxLength={NOTE_MAX}
          disabled={pending}
        />
      </div>

      <FormErrorSummary message={globalFormErrorMessage(adjust.error)} />

      <Button
        type="button"
        size="lg"
        className="w-full font-semibold"
        disabled={!view.canSave || pending}
        aria-busy={pending}
        onClick={() => {
          if (!reason) {
            return;
          }
          adjust.mutate({
            groupId,
            userId,
            points: view.points,
            reason,
            note: note.trim() || undefined,
          });
        }}
      >
        {view.saveLabel}
      </Button>
    </div>
  );
}

export type AdjustTierTarget = { userId: string; image: string | null };

/**
 * Adjust a member's Tier points (screen 2d): move the points, read the new
 * place and fish live, pick a reason the player will see, then save.
 */
export function AdjustTierDialog({
  groupId,
  groupName,
  members,
  target,
  onClose,
}: {
  groupId: string;
  groupName: string;
  members: readonly TierAdjustMember[];
  target: AdjustTierTarget | null;
  onClose: () => void;
}) {
  const m = useMessages();
  return (
    <ResponsiveDialog
      open={target != null}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{m.rating.adjust.title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {m.rating.adjust.subtitle(groupName)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {target ? (
          <AdjustTierForm
            key={target.userId}
            groupId={groupId}
            groupName={groupName}
            members={members}
            userId={target.userId}
            image={target.image}
            onDone={onClose}
          />
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
