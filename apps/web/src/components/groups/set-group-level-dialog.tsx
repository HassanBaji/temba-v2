"use client";

import { Minus, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { LevelSlider } from "~/components/groups/level-slider";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import {
  clampLevelTenths,
  levelSliderLabel,
  levelSliderReadout,
  levelSliderStartTenths,
} from "@repo/domain/level-slider";

export type SetGroupLevelMember = {
  userId: string;
  name: string;
  /** The member's Temba Level, where a first Group Level starts. */
  level: string | null;
  /** The member's Group Level in this Group, once they have one. */
  groupLevel: string | null;
};

function SetGroupLevelForm({
  groupId,
  member,
  onDone,
}: {
  groupId: string;
  member: SetGroupLevelMember;
  onDone: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.webGroup.setLevel;
  const startTenths = levelSliderStartTenths(member.groupLevel ?? member.level);
  const startLabel = levelSliderLabel(startTenths);
  const [tenths, setTenths] = React.useState(startTenths);
  const readout = levelSliderReadout({
    tenths,
    currentTenths: startTenths,
    locale,
  });
  const utils = api.useUtils();
  const setGroupLevel = api.ratings.setGroupLevel.useMutation({
    onSuccess: async () => {
      toast.success(m.you.setGroupLevel.saved);
      await utils.groups.byId.invalidate({ id: groupId });
      onDone();
    },
  });

  function step(delta: number) {
    setTenths((value) => clampLevelTenths(value + delta));
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-4 md:px-0 md:pb-0">
      <div className="border-rule rounded-card flex flex-col gap-1 border p-5">
        <p className="text-meta text-muted-foreground">
          {m.webGroup.setGroupLevel.level}
        </p>
        <p
          className="font-expanded flex items-baseline gap-3"
          aria-live="polite"
        >
          <span className="text-[44px] leading-none">
            {readout.displayBand}
          </span>
          <span className="text-[24px]">{readout.levelLabel}</span>
          <span className="text-body ms-auto">{readout.deltaLabel}</span>
        </p>
        <p className="text-meta text-muted-foreground">
          {member.groupLevel
            ? m.webGroup.setGroupLevel.current(startLabel)
            : member.level
              ? m.webGroup.setGroupLevel.startsFrom(startLabel)
              : m.webGroup.setGroupLevel.startsFromDefault}
        </p>
      </div>

      <LevelSlider
        tenths={tenths}
        currentTenths={startTenths}
        onTenthsChange={setTenths}
        currentLabel={
          !member.groupLevel && member.level
            ? m.webGroup.setGroupLevel.tembaMarker(startLabel)
            : undefined
        }
      />

      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 min-w-11"
          aria-label={copy.decrease}
          disabled={tenths <= LEVEL_TENTHS_MIN}
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
          aria-label={copy.increase}
          disabled={tenths >= LEVEL_TENTHS_MAX}
          onClick={() => step(1)}
        >
          <Plus aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          disabled={tenths === startTenths}
          onClick={() => setTenths(startTenths)}
        >
          {copy.reset}
        </Button>
      </div>

      <FormErrorSummary message={globalFormErrorMessage(setGroupLevel.error)} />

      <Button
        type="button"
        size="lg"
        className="w-full font-semibold"
        disabled={setGroupLevel.isPending}
        aria-busy={setGroupLevel.isPending}
        onClick={() =>
          setGroupLevel.mutate({
            groupId,
            userId: member.userId,
            levelTenths: tenths,
          })
        }
      >
        {m.you.setGroupLevel.save}
      </Button>
    </div>
  );
}

export function SetGroupLevelDialog({
  groupId,
  groupName,
  member,
  onClose,
}: {
  groupId: string;
  groupName: string;
  member: SetGroupLevelMember | null;
  onClose: () => void;
}) {
  const m = useMessages();
  return (
    <ResponsiveDialog
      open={member != null}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {m.you.setGroupLevel.title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {member ? m.you.setGroupLevel.body(member.name, groupName) : null}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {member ? (
          <SetGroupLevelForm
            key={member.userId}
            groupId={groupId}
            member={member}
            onDone={onClose}
          />
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
