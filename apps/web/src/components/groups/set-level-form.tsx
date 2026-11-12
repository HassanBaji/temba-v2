"use client";

import * as React from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

import { LevelSlider } from "~/components/groups/level-slider";
import { useLocale, useMessages } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { LevelCell } from "~/components/temba/level-cell";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Surface } from "~/components/ui/surface";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";
import {
  formatOvr,
  OVR_MAX,
  OVR_MIN,
  type LevelFace,
} from "@repo/domain/football-ovr";
import type { GroupLevelOverrideData } from "@repo/domain/group-data";
import type { LevelBand } from "@repo/domain/level-bands";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import {
  clampLevelTenths,
  clampOvrInput,
  LEVEL_OVERRIDE_NOTE_MAX,
  LEVEL_OVERRIDE_REASONS,
  levelOverrideCaption,
  levelOverrideReasonLabel,
  levelOverrideWhy,
  levelSliderLabel,
  levelSliderReadout,
  ovrSliderLabel,
  ovrSliderReadout,
  ovrSliderStart,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";
import type { Locale } from "@repo/i18n/locale";

export type SetLevelMember = {
  userId: string;
  name: string;
  levelBand: LevelBand | null;
  levelProvisional: boolean;
  level: string | null;
  /** The whole-number OVR of a football Level; absent or null on padel. */
  ovr?: number | null;
  ratedMatchCount: number;
  levelOverride: GroupLevelOverrideData | null;
};

/** A member with no Rating starts from the default placement, Level 3.0. */
const DEFAULT_CURRENT_TENTHS = 30;
const REASON_LABEL_ID = "set-level-reason";

/** How each face of the picker reads, steps and clamps (ADR-0069). */
const FACES = {
  level: {
    min: LEVEL_TENTHS_MIN,
    max: LEVEL_TENTHS_MAX,
    clamp: clampLevelTenths,
    label: levelSliderLabel,
    start: (member: SetLevelMember) => currentTenthsOf(member),
    readout: (value: number, current: number, locale: Locale) =>
      levelSliderReadout({ tenths: value, currentTenths: current, locale }),
  },
  ovr: {
    min: OVR_MIN,
    max: OVR_MAX,
    clamp: clampOvrInput,
    label: ovrSliderLabel,
    start: (member: SetLevelMember) => ovrSliderStart(member.ovr ?? null),
    readout: (value: number, current: number, locale: Locale) =>
      ovrSliderReadout({ ovr: value, currentOvr: current, locale }),
  },
} satisfies Record<LevelFace, unknown>;

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function currentTenthsOf(member: SetLevelMember) {
  return member.level
    ? clampLevelTenths(Number(member.level) * 10)
    : DEFAULT_CURRENT_TENTHS;
}

export function SetLevelMemberSummary({
  member,
  profileHref,
}: {
  member: SetLevelMember;
  profileHref?: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const override = member.levelOverride;

  return (
    <section className="border-rule rounded-card flex flex-col gap-3 border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lead break-words font-semibold">{member.name}</h2>
          <p className="text-meta text-muted-foreground">
            {m.webGroup.setLevel.ratedMatches(member.ratedMatchCount)}
          </p>
        </div>
        <LevelCell
          band={member.levelBand}
          level={member.ovr == null ? member.level : formatOvr(member.ovr)}
          provisional={member.levelProvisional}
          className="w-16 shrink-0"
        />
      </div>
      {override ? (
        <p className="text-meta border-rule border-t pt-3">
          <span className="text-muted-foreground">
            {m.webGroup.setLevel.latestSet}
          </span>
          {levelOverrideCaption({ ...override, locale })}
          {`. ${levelOverrideWhy({ ...override, locale })}`}
        </p>
      ) : null}
      {profileHref ? (
        <Button
          asChild
          variant="outline"
          className="min-h-11 w-full font-semibold"
        >
          <Link href={profileHref}>{m.webGroup.viewProfile}</Link>
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
  const setLevel = api.ratings.setLevel.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      await utils.groups.byId.invalidate({ id: groupId });
      await onSaved();
    },
  });

  return (
    <SetLevelFields
      member={member}
      pending={setLevel.isPending}
      error={setLevel.error}
      onSubmit={({ value, reason, note }) =>
        setLevel.mutate({
          groupId,
          userId: member.userId,
          levelTenths: value,
          reason,
          note,
        })
      }
    />
  );
}

/**
 * The slider, reason, note and submit of a Level override, for any caller's
 * mutation. `face` "ovr" sets a football Level in whole OVR; the value handed
 * to `onSubmit` is in the face's unit. A reason is required (ADR-0073).
 */
export function SetLevelFields({
  member,
  face = "level",
  pending,
  error,
  onSubmit,
}: {
  member: SetLevelMember;
  face?: LevelFace;
  pending: boolean;
  error: Parameters<typeof globalFormErrorMessage>[0] | null;
  onSubmit: (args: {
    value: number;
    reason: LevelOverrideReason;
    note: string | undefined;
  }) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.webGroup.setLevel;
  const scale = FACES[face];
  const currentValue = scale.start(member);
  const [value, setValue] = React.useState(currentValue);
  const [reason, setReason] = React.useState<LevelOverrideReason | null>(null);
  const [note, setNote] = React.useState("");

  const readout = scale.readout(value, currentValue, locale);
  const alreadyConfirmed = member.level !== null && !member.levelProvisional;
  const unchanged = alreadyConfirmed && value === currentValue;
  const wasLabel = member.level
    ? copy.was(scale.label(currentValue))
    : copy.noLevelYet;

  function step(delta: number) {
    setValue((current) => scale.clamp(current + delta));
  }

  return (
    <div className="flex flex-col gap-5">
      <Surface tone="ink" radius="card" className="flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-meta font-semibold">{copy.newLevel}</p>
          <p className="text-meta opacity-70">{wasLabel}</p>
        </div>
        <p
          className="font-expanded flex items-baseline gap-3"
          aria-live="polite"
        >
          <span dir="ltr" className="text-[60px] leading-[0.94]">
            {readout.displayBand}
          </span>
          <span className="text-[28px]">{readout.levelLabel}</span>
          <span className="text-body ms-auto">{readout.deltaLabel}</span>
        </p>
        <div className="text-meta flex justify-between">
          <span>
            {readout.toNext
              ? copy.toNext(readout.toNext.distanceLabel, readout.toNext.label)
              : copy.topOfScale}
          </span>
          <span>
            {copy.throughRung(readout.percentThroughRung, readout.rung.label)}
          </span>
        </div>
        <div
          aria-hidden="true"
          className="bg-on-focus/25 h-1.5 overflow-hidden rounded-full"
        >
          <div
            className="bg-on-focus h-full"
            style={{ width: `${readout.percentThroughRung}%` }}
          />
        </div>
        <div
          aria-hidden="true"
          className="text-meta flex justify-between opacity-70"
        >
          <span>{readout.rung.lowerLabel}</span>
          <span>{readout.rung.upperLabel}</span>
        </div>
      </Surface>

      <LevelSlider
        face={face}
        value={value}
        currentValue={currentValue}
        onValueChange={setValue}
      />

      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11"
          aria-label={face === "ovr" ? copy.decreaseOvr : copy.decrease}
          disabled={value <= scale.min}
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
          aria-label={face === "ovr" ? copy.increaseOvr : copy.increase}
          disabled={value >= scale.max}
          onClick={() => step(1)}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          disabled={value === currentValue}
          onClick={() => setValue(currentValue)}
        >
          {copy.reset}
        </Button>
      </div>

      <div className="space-y-2">
        <p id={REASON_LABEL_ID} className="text-body font-semibold">
          {copy.why(firstName(member.name))}
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
              disabled={pending}
              onClick={() => setReason(reason === option ? null : option)}
            >
              {levelOverrideReasonLabel(option, locale)}
            </ChoiceChip>
          ))}
        </RovingRadioGroup>
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={copy.notePlaceholder}
          aria-label={copy.noteLabel}
          maxLength={LEVEL_OVERRIDE_NOTE_MAX}
          disabled={pending}
        />
      </div>

      <FormErrorSummary
        message={error ? globalFormErrorMessage(error) : null}
      />

      <p className="text-body">
        {copy.confirmedNote}
        {member.levelProvisional
          ? ` ${copy.provisionalNote(firstName(member.name))}`
          : null}
      </p>

      <Button
        type="button"
        className="bg-control text-on-control border-control-edge min-h-11 w-full border font-semibold"
        disabled={unchanged || reason === null || pending}
        aria-busy={pending}
        onClick={() => {
          if (!reason) {
            return;
          }
          onSubmit({ value, reason, note: note.trim() || undefined });
        }}
      >
        {reason === null && !unchanged
          ? copy.pickReason
          : copy.setTo(scale.label(value))}
      </Button>
    </div>
  );
}
