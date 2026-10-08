"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Minus, Plus } from "lucide-react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { LevelSlider } from "~/components/groups/level-slider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Surface } from "~/components/ui/surface";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import type { GroupLevelOverrideData } from "@repo/domain/group-data";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import type { LevelBand } from "@repo/domain/level-bands";
import {
  clampLevelTenths,
  LEVEL_OVERRIDE_REASONS,
  levelOverrideCaption,
  levelOverrideReasonLabel,
  levelSliderLabel,
  levelSliderReadout,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";

export type SetLevelMember = {
  userId: string;
  name: string;
  levelBand: LevelBand | null;
  levelProvisional: boolean;
  level: string | null;
  ratedMatchCount: number;
  levelOverride: GroupLevelOverrideData | null;
};

export type SavedLevel = {
  name: string;
  levelLabel: string;
  reason: LevelOverrideReason | null;
};

/** A member with no Rating starts from the default placement, Level 3.0. */
const DEFAULT_CURRENT_TENTHS = 30;
const REASON_LABEL_ID = "set-level-reason";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function currentTenthsOf(member: SetLevelMember) {
  return member.level
    ? clampLevelTenths(Number(member.level) * 10)
    : DEFAULT_CURRENT_TENTHS;
}

function matchCountLabel(count: number) {
  return `${count} Rated ${count === 1 ? "Match" : "Matches"}`;
}

function MemberStep({
  member,
  profileHref,
  onSetLevel,
}: {
  member: SetLevelMember;
  profileHref?: string;
  onSetLevel: () => void;
}) {
  const letter = member.levelBand
    ? displayLabelFromStoredBand(member.levelBand)
    : null;
  const override = member.levelOverride;

  return (
    <div className="flex flex-col gap-5">
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{member.name}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {[
            override ? levelOverrideCaption(override) : null,
            matchCountLabel(member.ratedMatchCount),
          ]
            .filter(Boolean)
            .join(" · ")}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <p className="font-expanded flex items-baseline gap-3">
        <span className="text-[60px] leading-[0.94]">{letter ?? "–"}</span>
        {member.level ? (
          <span className="text-[20px]">{member.level}</span>
        ) : null}
      </p>

      {member.levelProvisional ? (
        <p className="text-body text-muted-foreground">
          This Level is still Provisional. Set it by hand if you know{" "}
          {firstName(member.name)} plays at a different Level.
        </p>
      ) : null}

      {override ? (
        <div className="border-rule rounded-md border px-3 py-2">
          <p className="text-meta text-muted-foreground">Latest Level set</p>
          <p className="text-body">
            {levelOverrideCaption(override)}
            {override.reason
              ? `. ${levelOverrideReasonLabel(override.reason)}`
              : null}
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        className="bg-ink text-paper min-h-11 w-full font-semibold"
        onClick={onSetLevel}
      >
        Set Level
      </Button>
      {profileHref ? (
        <Button
          asChild
          variant="outline"
          className="min-h-11 w-full font-semibold"
        >
          <Link href={profileHref}>View profile</Link>
        </Button>
      ) : null}
    </div>
  );
}

function SetLevelStep({
  groupId,
  member,
  onBack,
  onSaved,
}: {
  groupId: string;
  member: SetLevelMember;
  onBack: () => void;
  onSaved: (saved: SavedLevel) => void;
}) {
  const utils = api.useUtils();
  const currentTenths = currentTenthsOf(member);
  const [tenths, setTenths] = React.useState(currentTenths);
  const [reason, setReason] = React.useState<LevelOverrideReason | null>(null);

  const setLevel = api.ratings.setLevel.useMutation({
    onSuccess: async () => {
      await utils.groups.byId.invalidate({ id: groupId });
      onSaved({
        name: member.name,
        levelLabel: levelSliderLabel(tenths),
        reason,
      });
    },
  });

  const readout = levelSliderReadout({ tenths, currentTenths });
  const alreadyConfirmed = member.level !== null && !member.levelProvisional;
  const unchanged = alreadyConfirmed && tenths === currentTenths;
  const wasLabel = member.level
    ? `was ${levelSliderLabel(currentTenths)}`
    : "no Level yet";

  function step(delta: number) {
    setTenths((value) => clampLevelTenths(value + delta));
  }

  return (
    <div className="flex flex-col gap-5">
      <ResponsiveDialogHeader>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 min-h-11 self-start"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden="true" />
          Back
        </Button>
        <ResponsiveDialogTitle>
          Set Level for {member.name}
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription className="sr-only">
          Choose a Level from 0.0 to 7.0.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <Surface tone="ink" radius="card" className="flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-meta font-semibold">New Level</p>
          <p className="text-meta opacity-70">{wasLabel}</p>
        </div>
        <p
          className="font-expanded flex items-baseline gap-3"
          aria-live="polite"
        >
          <span className="text-[60px] leading-[0.94]">
            {readout.displayBand}
          </span>
          <span className="text-[28px]">{readout.levelLabel}</span>
          <span className="text-body ml-auto">{readout.deltaLabel}</span>
        </p>
        <div className="text-meta flex justify-between">
          <span>
            {readout.toNext
              ? `${readout.toNext.distanceLabel} to ${readout.toNext.label}`
              : "Top of the scale"}
          </span>
          <span>
            {readout.percentThroughRung}% through {readout.rung.label}
          </span>
        </div>
        <div
          aria-hidden="true"
          className="bg-paper/25 h-1.5 overflow-hidden rounded-full"
        >
          <div
            className="bg-paper h-full"
            style={{ width: `${readout.percentThroughRung}%` }}
          />
        </div>
        <div
          aria-hidden="true"
          className="text-meta flex justify-between opacity-70"
        >
          <span>{(readout.rung.lowerTenths / 10).toFixed(1)}</span>
          <span>{(readout.rung.upperTenths / 10).toFixed(1)}</span>
        </div>
      </Surface>

      <LevelSlider
        tenths={tenths}
        currentTenths={currentTenths}
        onTenthsChange={setTenths}
      />

      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11"
          aria-label="Decrease Level by 0.1"
          disabled={tenths <= 0}
          onClick={() => step(-1)}
        >
          <Minus aria-hidden="true" />
        </Button>
        <span className="font-expanded text-lead min-w-14 text-center">
          {readout.levelLabel}
        </span>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11"
          aria-label="Increase Level by 0.1"
          disabled={tenths >= 70}
          onClick={() => step(1)}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          disabled={tenths === currentTenths}
          onClick={() => setTenths(currentTenths)}
        >
          Reset
        </Button>
      </div>

      <div className="space-y-2">
        <p id={REASON_LABEL_ID} className="text-body font-semibold">
          Reason
        </p>
        <RovingRadioGroup
          aria-labelledby={REASON_LABEL_ID}
          className="flex flex-wrap gap-2"
        >
          {LEVEL_OVERRIDE_REASONS.map((option) => (
            <ChoiceChip
              key={option}
              role="radio"
              selected={reason === option}
              disabled={setLevel.isPending}
              onClick={() => setReason(reason === option ? null : option)}
            >
              {levelOverrideReasonLabel(option)}
            </ChoiceChip>
          ))}
        </RovingRadioGroup>
      </div>

      <FormErrorSummary
        message={setLevel.error ? globalFormErrorMessage(setLevel.error) : null}
      />

      <p className="text-body">
        A Level you set counts as confirmed. Rated Matches keep moving it from
        here.
        {member.levelProvisional
          ? ` ${firstName(member.name)} will no longer be Provisional, and setting again will not change that.`
          : null}
      </p>

      <ResponsiveDialogFooter>
        <Button
          type="button"
          className="bg-ink text-paper min-h-11 w-full font-semibold"
          disabled={unchanged || setLevel.isPending}
          aria-busy={setLevel.isPending}
          onClick={() =>
            setLevel.mutate({
              groupId,
              userId: member.userId,
              levelTenths: tenths,
              reason: reason ?? undefined,
            })
          }
        >
          Set to {levelSliderLabel(tenths)}
        </Button>
      </ResponsiveDialogFooter>
    </div>
  );
}

export function SetLevelDialog({
  groupId,
  member,
  profileHref,
  onOpenChange,
  onSaved,
}: {
  groupId: string;
  member: SetLevelMember | null;
  profileHref?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved: SavedLevel) => void;
}) {
  const [step, setStep] = React.useState<"member" | "set">("member");

  React.useEffect(() => {
    setStep("member");
  }, [member?.userId]);

  return (
    <ResponsiveDialog open={member !== null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[90dvh] overflow-y-auto">
        {member === null ? null : step === "member" ? (
          <MemberStep
            member={member}
            profileHref={profileHref}
            onSetLevel={() => setStep("set")}
          />
        ) : (
          <SetLevelStep
            groupId={groupId}
            member={member}
            onBack={() => setStep("member")}
            onSaved={(saved) => {
              onOpenChange(false);
              onSaved(saved);
            }}
          />
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
