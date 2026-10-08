"use client";

import * as React from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

import { LevelSlider } from "~/components/groups/level-slider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { LevelCell } from "~/components/temba/level-cell";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Surface } from "~/components/ui/surface";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import type { GroupLevelOverrideData } from "@repo/domain/group-data";
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

export function SetLevelMemberSummary({
  member,
  profileHref,
}: {
  member: SetLevelMember;
  profileHref?: string;
}) {
  const override = member.levelOverride;

  return (
    <section className="border-rule rounded-card flex flex-col gap-3 border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lead break-words font-semibold">{member.name}</h2>
          <p className="text-meta text-muted-foreground">
            {matchCountLabel(member.ratedMatchCount)}
          </p>
        </div>
        <LevelCell
          band={member.levelBand}
          level={member.level}
          provisional={member.levelProvisional}
          className="w-16 shrink-0"
        />
      </div>
      {override ? (
        <p className="text-meta border-rule border-t pt-3">
          <span className="text-muted-foreground">Latest Level set: </span>
          {levelOverrideCaption(override)}
          {override.reason
            ? `. ${levelOverrideReasonLabel(override.reason)}`
            : null}
        </p>
      ) : null}
      {profileHref ? (
        <Button
          asChild
          variant="outline"
          className="min-h-11 w-full font-semibold"
        >
          <Link href={profileHref}>View profile</Link>
        </Button>
      ) : null}
    </section>
  );
}

export function SetLevelForm({
  groupId,
  member,
  onSaved,
}: {
  groupId: string;
  member: SetLevelMember;
  onSaved: () => Promise<void> | void;
}) {
  const utils = api.useUtils();
  const currentTenths = currentTenthsOf(member);
  const [tenths, setTenths] = React.useState(currentTenths);
  const [reason, setReason] = React.useState<LevelOverrideReason | null>(null);

  const setLevel = api.ratings.setLevel.useMutation({
    onSuccess: async () => {
      await utils.groups.byId.invalidate({ id: groupId });
      await onSaved();
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
    </div>
  );
}
